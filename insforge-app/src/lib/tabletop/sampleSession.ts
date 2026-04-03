import type { MediaSource, PieceAsset, PieceInstance, RoomUser, SessionRole, TabletopSessionState } from "../ghostboard-shared";
import { NORMALIZED_BOARD_SIZE, createEmptySessionState } from "../ghostboard-shared";

export const DEMO_CURRENT_USER_ID = "host";
export const DEMO_ROOM_TITLE = "GhostBoard Seance Room";
export const DEMO_BOARD_SIZE = NORMALIZED_BOARD_SIZE;

export function createDemoUsers(): Record<string, RoomUser> {
  return {
    host: { userId: "host", displayName: "The Medium", role: "host" },
    editor: { userId: "editor", displayName: "The Handler", role: "editor" },
    spectator: { userId: "spectator", displayName: "The Watcher", role: "spectator" }
  };
}

export function createDemoPieces(assetMap: Record<string, PieceAsset>): Record<string, PieceInstance> {
  const candidates = [
    {
      id: "piece-host-pawn",
      assetId: "pawn-red",
      ownerId: "host",
      position: { x: 0.24, y: 0.34 },
      rotationDeg: 0,
      scale: 0.92,
      zIndex: 1,
      locked: false
    },
    {
      id: "piece-editor-token",
      assetId: "token-gold",
      ownerId: "editor",
      position: { x: 0.62, y: 0.58 },
      rotationDeg: 12,
      scale: 0.84,
      zIndex: 2,
      locked: false
    },
    {
      id: "piece-card",
      assetId: "card-back",
      ownerId: null,
      position: { x: 0.76, y: 0.27 },
      rotationDeg: -8,
      scale: 0.38,
      zIndex: 3,
      locked: true
    }
  ] as const;

  return Object.fromEntries(
    candidates
      .filter((piece) => piece.assetId in assetMap)
      .map((piece) => [
        piece.id,
        {
          ...piece,
          pivot: "center",
          metadata: {}
        }
      ])
  );
}

export function createSampleSessionState(args: {
  matchId: string;
  title?: string;
  assets: Record<string, PieceAsset>;
  mediaSource?: MediaSource | null;
}): TabletopSessionState {
  const session = createEmptySessionState({
    sessionId: args.matchId,
    title: args.title ?? DEMO_ROOM_TITLE,
    users: createDemoUsers(),
    assets: args.assets
  });

  session.mediaSource = args.mediaSource ?? null;
  session.pieces = args.mediaSource ? createDemoPieces(args.assets) : {};
  session.updatedAt = new Date().toISOString();

  return session;
}

export function getDefaultRoleForUser(
  users: Record<string, RoomUser>,
  userId: string = DEMO_CURRENT_USER_ID
): SessionRole {
  return users[userId]?.role ?? "spectator";
}
