"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";

import type { PieceInstance, TabletopSessionState } from "../../lib/ghostboard-shared";

import { createAssetLibrary } from "../../lib/tabletop/assets";
import { detectTableQuadFromImageData } from "../../lib/tabletop/cornerDetection";
import { isCalibrationValid } from "../../lib/tabletop/calibration";
import {
  createGhostBoardInsforgeClient,
  type GhostBoardInsforgeConfig
} from "../../lib/insforge/client";
import {
  DEMO_CURRENT_USER_ID,
  DEMO_ROOM_TITLE,
  createSampleSessionState,
  getDefaultRoleForUser
} from "../../lib/tabletop/sampleSession";
import {
  createLocalTabletopImageRecord,
  getAcceptedTabletopImageTypes,
  revokeLocalTabletopImageRecord,
  type LocalTabletopImageRecord
} from "../../lib/tabletop/uploads";
import { CalibrationEditor } from "./CalibrationEditor";
import { MediaStage } from "./MediaStage";
import { OverlayCanvas } from "./OverlayCanvas";
import { TableCalibrationOverlay } from "./TableCalibrationOverlay";
import { PieceInspector } from "./PieceInspector";
import { PiecePalette } from "./PiecePalette";
import { RoomSidebar } from "./RoomSidebar";

const assetLibrary = createAssetLibrary();

type RoomDemoClientProps = {
  matchId: string;
};

type InsforgeConnectionState = {
  status: "connecting" | "ready" | "missing" | "error";
  label: string;
  detail: string;
};

const browserInsforgeBaseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL?.trim();
const browserInsforgeAnonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY?.trim();

function getInitialSession(matchId: string): TabletopSessionState {
  return createSampleSessionState({
    matchId,
    title: DEMO_ROOM_TITLE,
    assets: assetLibrary.byId
  });
}

function getInitialSelectedPieceId(pieces: Record<string, PieceInstance>): string | null {
  return Object.keys(pieces)[0] ?? null;
}

function formatBytes(value: number): string {
  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

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

export function RoomDemoClient({ matchId }: RoomDemoClientProps) {
  const inputId = useId();
  const [session, setSession] = useState<TabletopSessionState>(() => getInitialSession(matchId));
  const [localImage, setLocalImage] = useState<LocalTabletopImageRecord | null>(null);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [insforgeConnection, setInsforgeConnection] = useState<InsforgeConnectionState>({
    status: "connecting",
    label: "Reaching for the linked InsForge project...",
    detail: "GhostBoard will use the linked project to mint an anon key and prepare the browser SDK."
  });
  const localImageRef = useRef<LocalTabletopImageRecord | null>(null);
  const insforgeClientRef = useRef<ReturnType<typeof createGhostBoardInsforgeClient> | null>(null);
  const uploadRequestIdRef = useRef(0);
  const currentRole = getDefaultRoleForUser(session.users, DEMO_CURRENT_USER_ID);
  const selectedPiece = selectedPieceId ? session.pieces[selectedPieceId] ?? null : null;
  const pieceList = Object.values(session.pieces);

  useEffect(() => {
    return () => {
      uploadRequestIdRef.current += 1;
      revokeLocalTabletopImageRecord(localImageRef.current);
      localImageRef.current = null;
      insforgeClientRef.current = null;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function connectInsforge() {
      if (browserInsforgeBaseUrl && browserInsforgeAnonKey) {
        insforgeClientRef.current = createGhostBoardInsforgeClient({
          projectName: "GhostBoard",
          baseUrl: browserInsforgeBaseUrl,
          anonKey: browserInsforgeAnonKey,
          region: "linked",
          appkey: "linked"
        });

        setInsforgeConnection({
          status: "ready",
          label: "Bound via public InsForge env",
          detail: `${browserInsforgeBaseUrl} • browser anon key loaded from NEXT_PUBLIC_INSFORGE_* env vars.`
        });
        return;
      }

      try {
        const response = await fetch("/api/insforge/public-config", { cache: "no-store" });
        const payload = (await response.json()) as Partial<GhostBoardInsforgeConfig> & { error?: string };

        if (!isActive) {
          return;
        }

        if (!response.ok || !payload.baseUrl || !payload.anonKey || !payload.projectName || !payload.region || !payload.appkey) {
          insforgeClientRef.current = null;
          setInsforgeConnection({
            status: response.status === 404 ? "missing" : "error",
            label: payload.error ?? "GhostBoard could not prepare its InsForge binding.",
            detail:
              response.status === 404
                ? "Run the InsForge CLI link command again if this repo should be attached to a project."
                : "Check the linked project, local network access, and InsForge auth settings."
          });
          return;
        }

        insforgeClientRef.current = createGhostBoardInsforgeClient({
          projectName: payload.projectName,
          baseUrl: payload.baseUrl,
          anonKey: payload.anonKey,
          region: payload.region,
          appkey: payload.appkey,
          publicConfig: payload.publicConfig
        });

        setInsforgeConnection({
          status: "ready",
          label: `Bound to ${payload.projectName}`,
          detail: `${payload.baseUrl} • anon browser client prepared for GhostBoard.`
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        insforgeClientRef.current = null;
        setInsforgeConnection({
          status: "error",
          label: error instanceof Error ? error.message : "GhostBoard could not reach InsForge.",
          detail: "The local Next.js route could not fetch a public browser config from the linked InsForge project."
        });
      }
    }

    void connectInsforge();

    return () => {
      isActive = false;
    };
  }, []);

  function replaceLocalImage(nextLocalImage: LocalTabletopImageRecord | null) {
    const previousLocalImage = localImageRef.current;

    localImageRef.current = nextLocalImage;
    setLocalImage(nextLocalImage);
    revokeLocalTabletopImageRecord(previousLocalImage);
  }

  async function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const requestId = uploadRequestIdRef.current + 1;

    uploadRequestIdRef.current = requestId;
    event.target.value = "";

    if (!file) {
      return;
    }

    setUploadError(null);

    try {
      const nextLocalImage = await createLocalTabletopImageRecord(file);

      if (uploadRequestIdRef.current !== requestId) {
        revokeLocalTabletopImageRecord(nextLocalImage);
        return;
      }

      const imageData = await loadImageDataFromMediaSource(nextLocalImage.mediaSource);
      const detectedCalibration = detectTableQuadFromImageData(imageData, nextLocalImage.mediaSource);

      replaceLocalImage(nextLocalImage);
      setSession(() => {
        const nextSession = createSampleSessionState({
          matchId,
          title: DEMO_ROOM_TITLE,
          assets: assetLibrary.byId,
          mediaSource: nextLocalImage.mediaSource
        });

        nextSession.calibration = detectedCalibration;
        nextSession.updatedAt = new Date().toISOString();

        return nextSession;
      });
      setSelectedPieceId("piece-host-pawn");
    } catch (error) {
      if (uploadRequestIdRef.current === requestId) {
        setUploadError(error instanceof Error ? error.message : "GhostBoard could not prepare that table image.");
      }
    }
  }

  function handleClearImage() {
    uploadRequestIdRef.current += 1;
    setUploadError(null);
    replaceLocalImage(null);
    setSession(getInitialSession(matchId));
    setSelectedPieceId(null);
  }

  function handleSelectPiece(pieceId: string) {
    setSelectedPieceId(pieceId);
  }

  function handleCalibrationChange(nextCalibration: NonNullable<TabletopSessionState["calibration"]>) {
    setSession((currentSession) => ({
      ...currentSession,
      calibration: nextCalibration,
      updatedAt: new Date().toISOString()
    }));
  }

  async function handleAutoDetectCorners() {
    if (!session.mediaSource) {
      return;
    }

    try {
      const imageData = await loadImageDataFromMediaSource(session.mediaSource);
      const nextCalibration = detectTableQuadFromImageData(imageData, session.mediaSource);
      handleCalibrationChange(nextCalibration);
      setUploadError(null);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "GhostBoard could not auto-detect this table surface.");
    }
  }

  const calibrationLabel = isCalibrationValid(session.calibration)
    ? `Normalized board space 0..${session.calibration.normalizedWidth} x 0..${session.calibration.normalizedHeight}`
    : "Choose a table image to let GhostBoard seed local calibration metadata";

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
          users={Object.values(session.users)}
          currentRole={currentRole}
          insforgeStatus={insforgeConnection.status}
          insforgeLabel={insforgeConnection.label}
          insforgeDetail={insforgeConnection.detail}
          mediaLabel={
            localImage
              ? `${localImage.fileName} • ${localImage.mediaSource.width}x${localImage.mediaSource.height} • ${formatBytes(localImage.fileSizeBytes)}`
              : "No GhostBoard local image selected"
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
                  cursor: "pointer",
                  display: "inline-flex",
                  fontSize: 14,
                  fontWeight: 600,
                  padding: "10px 14px"
                }}
              >
                Summon table image
              </label>
              <input
                id={inputId}
                accept={getAcceptedTabletopImageTypes().join(",")}
                onChange={handleImageSelection}
                style={{ display: "none" }}
                type="file"
              />
              <p style={{ color: "#475569", fontSize: 12, margin: "10px 0 0" }}>
                Local browser object URLs only. GhostBoard keeps this image in-browser for now and does not persist or upload it.
              </p>
              {uploadError ? (
                <p style={{ color: "#b91c1c", fontSize: 13, margin: "10px 0 0" }}>{uploadError}</p>
              ) : null}
              {localImage ? (
                <button
                  onClick={handleClearImage}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: 12,
                    color: "#0f172a",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    marginTop: 12,
                    padding: "8px 12px"
                  }}
                  type="button"
                >
                  Banish local image
                </button>
              ) : null}
            </>
          }
        />

        <div style={{ display: "grid", gap: 24 }}>
          <MediaStage
            mediaSource={session.mediaSource}
            mediaLabel={localImage?.fileName ?? null}
            statusLabel={localImage ? "Local image ready" : "Waiting for local image"}
            emptyStateAction={
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
                Summon table image
              </label>
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
            onSelectPiece={handleSelectPiece}
          />
        </div>

        <div style={{ display: "grid", gap: 24 }}>
          <PiecePalette assets={assetLibrary.assets} role={currentRole} />
          <PieceInspector assets={session.assets} selectedPiece={selectedPiece} />
        </div>
      </div>
    </main>
  );
}
