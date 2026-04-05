"use client";

import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from "react";

import type { TabletopSessionState } from "../../lib/ghostboard-shared";

import {
  GHOSTBOARD_MULTIPLAYER_SERVER,
  createTabletopClient,
  ensureRoomIdentity,
  type StoredRoomIdentity
} from "../../lib/boardgame/client";
import { createAssetLibrary } from "../../lib/tabletop/assets";
import { detectTableQuadFromImageData } from "../../lib/tabletop/cornerDetection";
import { isCalibrationValid } from "../../lib/tabletop/calibration";
import {
  createLocalTabletopImageRecord,
  getAcceptedTabletopImageTypes,
  revokeLocalTabletopImageRecord,
  type LocalTabletopImageRecord
} from "../../lib/tabletop/uploads";
import { CalibrationEditor } from "./CalibrationEditor";
import { MediaStage } from "./MediaStage";
import { OverlayCanvas } from "./OverlayCanvas";
import { PieceInspector } from "./PieceInspector";
import { PiecePalette } from "./PiecePalette";
import { RoomSidebar } from "./RoomSidebar";
import { TableCalibrationOverlay } from "./TableCalibrationOverlay";

const assetLibrary = createAssetLibrary();

type RoomDemoClientProps = {
  matchId: string;
};

type ConnectionState = {
  status: "connecting" | "ready" | "spectating" | "error";
  label: string;
  detail: string;
};

async function loadImageDataFromMediaSource(mediaSource: NonNullable<TabletopSessionState["mediaSource"]>) {
  const image = new Image();
  image.decoding = "async";
  image.src = mediaSource.assetUrl;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = mediaSource.width;
  canvas.height = mediaSource.height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("GhostBoard could not inspect this image for corner detection.");
  }

  context.drawImage(image, 0, 0, mediaSource.width, mediaSource.height);
  return context.getImageData(0, 0, mediaSource.width, mediaSource.height);
}

function formatBytes(value: number): string {
  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function createPiecePosition(index: number) {
  const column = index % 4;
  const row = Math.floor(index / 4) % 3;

  return {
    x: 0.2 + column * 0.18,
    y: 0.22 + row * 0.18
  };
}

export function RoomDemoClient({ matchId }: RoomDemoClientProps) {
  const inputId = useId();
  const clientRef = useRef<ReturnType<typeof createTabletopClient> | null>(null);
  const [session, setSession] = useState<TabletopSessionState | null>(null);
  const [roomIdentity, setRoomIdentity] = useState<StoredRoomIdentity | null>(null);
  const [localImage, setLocalImage] = useState<LocalTabletopImageRecord | null>(null);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [roomUrl, setRoomUrl] = useState<string>(`/table/${matchId}`);
  const [connection, setConnection] = useState<ConnectionState>({
    status: "connecting",
    label: "Connecting to the GhostBoard multiplayer server...",
    detail: `Expected boardgame.io server: ${GHOSTBOARD_MULTIPLAYER_SERVER}`
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setRoomUrl(window.location.href);
    }
  }, [matchId]);

  useEffect(() => {
    let isActive = true;

    async function connect() {
      try {
        const identity = await ensureRoomIdentity(matchId);
        if (!isActive) {
          return;
        }

        setRoomIdentity(identity);

        const client = createTabletopClient({
          matchID: matchId,
          playerID: identity.playerID,
          credentials: identity.credentials
        });

        clientRef.current = client;
        client.subscribe((state) => {
          if (!isActive || !state) {
            return;
          }

          setSession(state.G);
        });
        client.start();

        setConnection(
          identity.playerID
            ? {
                status: "ready",
                label: `Connected to ${matchId} as ${identity.playerName}`,
                detail: `Player slot ${identity.playerID} is subscribed through ${GHOSTBOARD_MULTIPLAYER_SERVER}.`
              }
            : {
                status: "spectating",
                label: `Watching ${matchId} as ${identity.playerName}`,
                detail: "All interactive slots are occupied, so this browser joined as a synchronized spectator."
              }
        );
      } catch (error) {
        if (!isActive) {
          return;
        }

        setConnection({
          status: "error",
          label: error instanceof Error ? error.message : "GhostBoard could not connect to this room.",
          detail: `Check that the multiplayer server is running at ${GHOSTBOARD_MULTIPLAYER_SERVER}.`
        });
      }
    }

    void connect();

    return () => {
      isActive = false;
      clientRef.current?.stop();
      clientRef.current = null;
    };
  }, [matchId]);

  useEffect(() => () => revokeLocalTabletopImageRecord(localImage), [localImage]);

  useEffect(() => {
    if (!session || !roomIdentity?.playerID || !clientRef.current) {
      return;
    }

    const existing = session.users[roomIdentity.playerID];
    if (existing?.displayName === roomIdentity.playerName) {
      return;
    }

    const joinRoomMove = clientRef.current.moves.joinRoom;
    if (!joinRoomMove) {
      return;
    }

    joinRoomMove({
      displayName: roomIdentity.playerName,
      role: roomIdentity.playerID === "0" ? "host" : "editor"
    });
  }, [roomIdentity, session]);

  const currentRole = roomIdentity?.playerID ? session?.users[roomIdentity.playerID]?.role ?? (roomIdentity.playerID === "0" ? "host" : "editor") : "spectator";
  const pieceList = useMemo(() => Object.values(session?.pieces ?? {}), [session?.pieces]);
  const selectedPiece = selectedPieceId ? session?.pieces[selectedPieceId] ?? null : null;

  async function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !clientRef.current) {
      return;
    }

    setUploadError(null);

    try {
      const nextLocalImage = await createLocalTabletopImageRecord(file);
      const imageData = await loadImageDataFromMediaSource(nextLocalImage.mediaSource);
      const nextCalibration = detectTableQuadFromImageData(imageData, nextLocalImage.mediaSource);

      revokeLocalTabletopImageRecord(localImage);
      setLocalImage(nextLocalImage);

      const setMediaSourceMove = clientRef.current.moves.setMediaSource;
      const setCalibrationMove = clientRef.current.moves.setCalibration;
      setMediaSourceMove?.(nextLocalImage.mediaSource);
      setCalibrationMove?.(nextCalibration);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "GhostBoard could not prepare that table image.");
    }
  }

  async function handleAutoDetectCorners() {
    if (!session?.mediaSource || !clientRef.current) {
      return;
    }

    try {
      const imageData = await loadImageDataFromMediaSource(session.mediaSource);
      const nextCalibration = detectTableQuadFromImageData(imageData, session.mediaSource);
      clientRef.current.moves.setCalibration?.(nextCalibration);
      setUploadError(null);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "GhostBoard could not auto-detect this table surface.");
    }
  }

  function handleCalibrationChange(nextCalibration: NonNullable<TabletopSessionState["calibration"]>) {
    clientRef.current?.moves.setCalibration?.(nextCalibration);
  }

  function handleCreatePiece(assetId: string) {
    if (!session?.calibration || !clientRef.current) {
      return;
    }

    const nextId = `piece-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    setSelectedPieceId(nextId);
    clientRef.current.moves.createPiece?.({
      id: nextId,
      assetId,
      position: createPiecePosition(pieceList.length),
      rotationDeg: 0,
      scale: assetId === "card-back" ? 0.4 : 0.82,
      zIndex: pieceList.length + 1
    });
  }

  const calibrationLabel = session?.calibration && isCalibrationValid(session.calibration)
    ? `Normalized board space 0..${session.calibration.normalizedWidth} x 0..${session.calibration.normalizedHeight}`
    : "Upload a table image to generate and refine synchronized calibration";

  if (!session) {
    return (
      <main
        style={{
          background:
            "radial-gradient(circle at top, rgba(34, 211, 238, 0.18) 0%, rgba(34, 211, 238, 0) 24%), radial-gradient(circle at 15% 15%, rgba(168, 85, 247, 0.20) 0%, rgba(168, 85, 247, 0) 25%), linear-gradient(180deg, #020617 0%, #0f172a 48%, #111827 100%)",
          color: "#e2e8f0",
          minHeight: "100vh",
          padding: 24
        }}
      >
        <div style={{ margin: "0 auto", maxWidth: 820, paddingTop: 80, textAlign: "center" }}>
          <h1 style={{ fontSize: 32, marginBottom: 12 }}>Connecting to GhostBoard room…</h1>
          <p style={{ color: "#94a3b8", fontSize: 16 }}>{connection.label}</p>
          <p style={{ color: "#64748b", fontSize: 14 }}>{connection.detail}</p>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        background:
          "radial-gradient(circle at top, rgba(34, 211, 238, 0.18) 0%, rgba(34, 211, 238, 0) 24%), radial-gradient(circle at 15% 15%, rgba(168, 85, 247, 0.20) 0%, rgba(168, 85, 247, 0) 25%), linear-gradient(180deg, #020617 0%, #0f172a 48%, #111827 100%)",
        color: "#e2e8f0",
        minHeight: "100vh",
        padding: 24
      }}
    >
      <div className="table-shell">
        <RoomSidebar
          matchId={matchId}
          roomTitle={session.title}
          roomUrl={roomUrl}
          users={Object.values(session.users)}
          currentRole={currentRole}
          connectionStatus={connection.status}
          connectionLabel={connection.label}
          connectionDetail={connection.detail}
          mediaLabel={
            localImage
              ? `${localImage.fileName} • ${localImage.mediaSource.width}x${localImage.mediaSource.height} • ${formatBytes(localImage.fileSizeBytes)}`
              : session.mediaSource
                ? `${session.mediaSource.width}x${session.mediaSource.height} shared room image`
                : "No room image selected"
          }
          calibrationLabel={calibrationLabel}
          assetCount={Object.keys(session.assets).length}
          pieceCount={pieceList.length}
          uploadControl={
            <>
              <label
                htmlFor={inputId}
                style={{
                  background: "#0f172a",
                  borderRadius: 14,
                  color: "#f8fafc",
                  cursor: currentRole === "host" ? "pointer" : "not-allowed",
                  display: "inline-flex",
                  fontSize: 14,
                  fontWeight: 600,
                  opacity: currentRole === "host" ? 1 : 0.55,
                  padding: "10px 14px"
                }}
              >
                Share table image
              </label>
              <input
                id={inputId}
                accept={getAcceptedTabletopImageTypes().join(",")}
                disabled={currentRole !== "host"}
                onChange={handleImageSelection}
                style={{ display: "none" }}
                type="file"
              />
              <p style={{ color: "#475569", fontSize: 12, margin: "10px 0 0" }}>
                Images are encoded into shared room state so everyone opening this URL sees the same tabletop background.
              </p>
              {uploadError ? <p style={{ color: "#b91c1c", fontSize: 13, margin: "10px 0 0" }}>{uploadError}</p> : null}
            </>
          }
        />

        <div style={{ display: "grid", gap: 24 }}>
          <MediaStage
            mediaSource={session.mediaSource}
            mediaLabel={localImage?.fileName ?? `Room ${matchId} tabletop`}
            statusLabel={session.mediaSource ? "Shared room image ready" : "Waiting for room image"}
            emptyStateAction={
              currentRole === "host" ? (
                <label
                  htmlFor={inputId}
                  style={{
                    background: "linear-gradient(135deg, #22d3ee 0%, #a855f7 100%)",
                    borderRadius: 14,
                    boxShadow: "0 10px 24px rgba(34, 211, 238, 0.22)",
                    color: "#020617",
                    cursor: "pointer",
                    display: "inline-flex",
                    fontSize: 15,
                    fontWeight: 700,
                    padding: "12px 18px"
                  }}
                >
                  Share table image
                </label>
              ) : <span>Waiting for the host to share a table image…</span>
            }
          >
            {({ intrinsicSize, renderedRect }) => (
              <TableCalibrationOverlay
                calibration={session.calibration}
                editable={currentRole === "host"}
                intrinsicSize={intrinsicSize}
                renderedRect={renderedRect}
                onChangeCalibration={handleCalibrationChange}
              />
            )}
          </MediaStage>
          <CalibrationEditor calibration={session.calibration} role={currentRole} onAutoDetect={handleAutoDetectCorners} />
          <OverlayCanvas
            assets={session.assets}
            pieces={pieceList}
            role={currentRole}
            selectedPieceId={selectedPiece?.id ?? null}
            onSelectPiece={setSelectedPieceId}
          />
        </div>

        <div style={{ display: "grid", gap: 24 }}>
          <PiecePalette assets={assetLibrary.assets} role={currentRole} onCreatePiece={handleCreatePiece} />
          <PieceInspector assets={session.assets} selectedPiece={selectedPiece} />
        </div>
      </div>
    </main>
  );
}
