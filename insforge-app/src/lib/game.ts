import type { Ctx, Game } from "boardgame.io";
import { INVALID_MOVE } from "boardgame.io/dist/cjs/core.js";

import {
  NORMALIZED_BOARD_SIZE,
  createEmptySessionState,
  isNormalizedBoardPoint,
  isSessionRole,
  type CreatePieceInput,
  type DeletePieceInput,
  type JoinRoomInput,
  type MediaSource,
  type PieceAsset,
  type PieceInstance,
  type RoomUser,
  type SessionRole,
  type SetPieceLockedInput,
  type SetUserRoleInput,
  type TableCalibration,
  type TabletopSessionState,
  type UpdatePieceTransformInput
} from "./ghostboard-shared";

export type TabletopSessionSetupData = {
  title?: string;
  assets?: Record<string, PieceAsset>;
  users?: Record<string, RoomUser>;
  now?: string;
};

type TabletopMoveContext = {
  G: TabletopSessionState;
  ctx: Ctx;
  playerID: string;
};

function getUserRole(G: TabletopSessionState, playerId: string | null | undefined): SessionRole | null {
  if (!playerId) {
    return null;
  }

  return G.users[playerId]?.role ?? null;
}

function requireRole(
  G: TabletopSessionState,
  playerId: string | null | undefined,
  roles: SessionRole[]
): SessionRole | "INVALID_MOVE" {
  const role = getUserRole(G, playerId);

  if (!role || !roles.includes(role)) {
    return "INVALID_MOVE";
  }

  return role;
}

function isFiniteVec2(value: { x: number; y: number }): boolean {
  return Number.isFinite(value.x) && Number.isFinite(value.y);
}

function isValidMediaSource(value: MediaSource): boolean {
  return (
    value.kind === "image" &&
    Number.isFinite(value.width) &&
    value.width > 0 &&
    Number.isFinite(value.height) &&
    value.height > 0 &&
    typeof value.assetUrl === "string" &&
    value.assetUrl.length > 0
  );
}

function isValidCalibration(value: TableCalibration): boolean {
  const quad = value.tableQuadMediaPx;
  const points = [quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft];

  return (
    value.transformVersion === "homography-v1" &&
    Number.isFinite(value.mediaWidth) &&
    value.mediaWidth > 0 &&
    Number.isFinite(value.mediaHeight) &&
    value.mediaHeight > 0 &&
    value.normalizedWidth === NORMALIZED_BOARD_SIZE.width &&
    value.normalizedHeight === NORMALIZED_BOARD_SIZE.height &&
    points.every(isFiniteVec2)
  );
}

function canMutateUnlockedPieces(role: SessionRole): boolean {
  return role === "host" || role === "editor";
}

function createPieceInstance(input: CreatePieceInput, ownerId: string | null, asset: PieceAsset): PieceInstance {
  return {
    id: input.id,
    assetId: asset.id,
    ownerId,
    position: input.position,
    rotationDeg: input.rotationDeg ?? 0,
    scale: input.scale ?? 1,
    zIndex: input.zIndex ?? 0,
    locked: false,
    pivot: "center",
    metadata: input.metadata ?? {}
  };
}

const joinRoom = ({ G, playerID }: TabletopMoveContext, input: JoinRoomInput) => {
  if (!playerID || typeof input.displayName !== "string" || input.displayName.trim().length === 0) {
    return INVALID_MOVE;
  }

  const nextRole = input.role && isSessionRole(input.role) ? input.role : playerID === "0" ? "host" : "editor";
  G.users[playerID] = {
    userId: playerID,
    displayName: input.displayName.trim(),
    role: nextRole
  };
  G.updatedAt = new Date().toISOString();
};

const setMediaSource = ({ G, playerID }: TabletopMoveContext, mediaSource: MediaSource) => {
  if (requireRole(G, playerID, ["host"]) === INVALID_MOVE) {
    return INVALID_MOVE;
  }

  if (!isValidMediaSource(mediaSource)) {
    return INVALID_MOVE;
  }

  G.mediaSource = mediaSource;
  G.calibration = null;
  G.updatedAt = new Date().toISOString();
};

const setCalibration = ({ G, playerID }: TabletopMoveContext, calibration: TableCalibration) => {
  if (requireRole(G, playerID, ["host"]) === INVALID_MOVE) {
    return INVALID_MOVE;
  }

  if (!G.mediaSource || !isValidCalibration(calibration)) {
    return INVALID_MOVE;
  }

  G.calibration = calibration;
  G.updatedAt = new Date().toISOString();
};

const createPiece = ({ G, playerID }: TabletopMoveContext, input: CreatePieceInput) => {
  const role = requireRole(G, playerID, ["host", "editor"]);

  if (role === "INVALID_MOVE") {
    return INVALID_MOVE;
  }

  if (!G.calibration || G.pieces[input.id] || !isNormalizedBoardPoint(input.position)) {
    return INVALID_MOVE;
  }

  if (
    !Number.isFinite(input.rotationDeg ?? 0) ||
    !Number.isFinite(input.scale ?? 1) ||
    (input.scale ?? 1) <= 0
  ) {
    return INVALID_MOVE;
  }

  const asset = G.assets[input.assetId];

  if (!asset) {
    return INVALID_MOVE;
  }

  G.pieces[input.id] = createPieceInstance(input, playerID, asset);
  G.updatedAt = new Date().toISOString();
};

const updatePieceTransform = ({ G, playerID }: TabletopMoveContext, input: UpdatePieceTransformInput) => {
  const role = requireRole(G, playerID, ["host", "editor"]);

  if (role === "INVALID_MOVE") {
    return INVALID_MOVE;
  }

  const piece = G.pieces[input.id];

  if (!piece || (piece.locked && role !== "host")) {
    return INVALID_MOVE;
  }

  if (input.position && !isNormalizedBoardPoint(input.position)) {
    return INVALID_MOVE;
  }

  if (
    (input.rotationDeg !== undefined && !Number.isFinite(input.rotationDeg)) ||
    (input.scale !== undefined && (!Number.isFinite(input.scale) || input.scale <= 0)) ||
    (input.zIndex !== undefined && !Number.isFinite(input.zIndex))
  ) {
    return INVALID_MOVE;
  }

  if (input.position) {
    piece.position = input.position;
  }

  if (input.rotationDeg !== undefined) {
    piece.rotationDeg = input.rotationDeg;
  }

  if (input.scale !== undefined) {
    piece.scale = input.scale;
  }

  if (input.zIndex !== undefined) {
    piece.zIndex = input.zIndex;
  }

  G.updatedAt = new Date().toISOString();
};

const setPieceLocked = ({ G, playerID }: TabletopMoveContext, input: SetPieceLockedInput) => {
  if (requireRole(G, playerID, ["host"]) === INVALID_MOVE) {
    return INVALID_MOVE;
  }

  const piece = G.pieces[input.id];

  if (!piece) {
    return INVALID_MOVE;
  }

  piece.locked = input.locked;
  G.updatedAt = new Date().toISOString();
};

const deletePiece = ({ G, playerID }: TabletopMoveContext, input: DeletePieceInput) => {
  const role = requireRole(G, playerID, ["host", "editor"]);

  if (role === "INVALID_MOVE") {
    return INVALID_MOVE;
  }

  const piece = G.pieces[input.id];

  if (!piece || (piece.locked && role !== "host")) {
    return INVALID_MOVE;
  }

  delete G.pieces[input.id];
  G.updatedAt = new Date().toISOString();
};

const setUserRole = ({ G, playerID }: TabletopMoveContext, input: SetUserRoleInput) => {
  if (requireRole(G, playerID, ["host"]) === INVALID_MOVE) {
    return INVALID_MOVE;
  }

  const user = G.users[input.userId];

  if (!user || !isSessionRole(input.role)) {
    return INVALID_MOVE;
  }

  G.users[input.userId] = {
    userId: user.userId,
    displayName: user.displayName,
    role: input.role
  };
  G.updatedAt = new Date().toISOString();
};

export const TabletopSessionGame: Game<TabletopSessionState, Record<string, unknown>, TabletopSessionSetupData> = {
  name: "tabletop-session",
  setup: (ctx, setupData) =>
    createEmptySessionState({
      sessionId: String(ctx.matchID),
      title: setupData?.title ?? "Untitled Table",
      ...(setupData?.users ? { users: setupData.users } : {}),
      ...(setupData?.assets ? { assets: setupData.assets } : {}),
      ...(setupData?.now ? { now: setupData.now } : {})
    }),
  moves: {
    joinRoom,
    setMediaSource,
    setCalibration,
    createPiece,
    updatePieceTransform,
    setPieceLocked,
    deletePiece,
    setUserRole
  }
};

export function userCanEditPieces(role: SessionRole | null): boolean {
  return role ? canMutateUnlockedPieces(role) : false;
}
