import type {
  MediaSource,
  PieceAsset,
  RoomUser,
  TableCalibration,
  TabletopSessionState
} from "@ghostboard/shared";

export type StoredBoardgameSnapshot = {
  state: TabletopSessionState;
  metadata?: Record<string, string>;
};

export type RoomRecord = {
  id: string;
  title: string;
  mediaSource: MediaSource | null;
  calibration: TableCalibration | null;
  users: Record<string, RoomUser>;
  assets: Record<string, PieceAsset>;
  boardgameSnapshot: StoredBoardgameSnapshot | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateRoomInput = {
  id: string;
  title: string;
  users?: Record<string, RoomUser>;
  assets?: Record<string, PieceAsset>;
  now?: string;
};

export function createRoomRecord(input: CreateRoomInput): RoomRecord {
  const now = input.now ?? new Date().toISOString();

  return {
    id: input.id,
    title: input.title,
    mediaSource: null,
    calibration: null,
    users: input.users ?? {},
    assets: input.assets ?? {},
    boardgameSnapshot: null,
    createdAt: now,
    updatedAt: now
  };
}
