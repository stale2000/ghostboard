export type Vec2 = {
  x: number;
  y: number;
};

export const NORMALIZED_BOARD_MIN = 0;
export const NORMALIZED_BOARD_SIZE = {
  width: 1,
  height: 1
} as const;

export type Quad = {
  topLeft: Vec2;
  topRight: Vec2;
  bottomRight: Vec2;
  bottomLeft: Vec2;
};

export type SessionRole = "host" | "editor" | "spectator";

export type MediaSource = {
  kind: "image";
  assetUrl: string;
  width: number;
  height: number;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
};

export type TableCalibration = {
  mediaWidth: number;
  mediaHeight: number;
  tableQuadMediaPx: Quad;
  normalizedWidth: number;
  normalizedHeight: number;
  transformVersion: "homography-v1";
  createdAt: string;
  updatedAt: string;
};

export type PieceAsset = {
  id: string;
  name: string;
  imageUrl: string;
  width: number;
  height: number;
  tags: string[];
};

export type PieceMetadataValue = string | number | boolean;

export type PieceInstance = {
  id: string;
  assetId: string;
  ownerId: string | null;
  position: Vec2;
  rotationDeg: number;
  scale: number;
  zIndex: number;
  locked: boolean;
  pivot: "center";
  metadata: Record<string, PieceMetadataValue>;
};

export type RoomUser = {
  userId: string;
  role: SessionRole;
  displayName: string;
};

export type TabletopSessionState = {
  sessionId: string;
  title: string;
  mediaSource: MediaSource | null;
  calibration: TableCalibration | null;
  assets: Record<string, PieceAsset>;
  pieces: Record<string, PieceInstance>;
  users: Record<string, RoomUser>;
  createdAt: string;
  updatedAt: string;
};

export type CreatePieceInput = {
  id: string;
  assetId: string;
  position: Vec2;
  rotationDeg?: number;
  scale?: number;
  zIndex?: number;
  metadata?: Record<string, PieceMetadataValue>;
};

export type UpdatePieceTransformInput = {
  id: string;
  position?: Vec2;
  rotationDeg?: number;
  scale?: number;
  zIndex?: number;
};

export type SetPieceLockedInput = {
  id: string;
  locked: boolean;
};

export type DeletePieceInput = {
  id: string;
};

export type SetUserRoleInput = {
  userId: string;
  role: SessionRole;
};

export const SESSION_ROLES: SessionRole[] = ["host", "editor", "spectator"];

export function isSessionRole(value: string): value is SessionRole {
  return SESSION_ROLES.includes(value as SessionRole);
}

export function createEmptySessionState(args: {
  sessionId: string;
  title: string;
  users?: Record<string, RoomUser>;
  assets?: Record<string, PieceAsset>;
  now?: string;
}): TabletopSessionState {
  const now = args.now ?? new Date().toISOString();

  return {
    sessionId: args.sessionId,
    title: args.title,
    mediaSource: null,
    calibration: null,
    assets: args.assets ?? {},
    pieces: {},
    users: args.users ?? {},
    createdAt: now,
    updatedAt: now
  };
}

export function isNormalizedBoardPoint(point: Vec2): boolean {
  return (
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    point.x >= NORMALIZED_BOARD_MIN &&
    point.x <= NORMALIZED_BOARD_SIZE.width &&
    point.y >= NORMALIZED_BOARD_MIN &&
    point.y <= NORMALIZED_BOARD_SIZE.height
  );
}
