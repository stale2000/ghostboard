import {
  createEmptySessionState,
  type PieceAsset,
  type RoomUser,
  type TabletopSessionState
} from "@ghostboard/shared";

import {
  createRoomRecord,
  type CreateRoomInput,
  type RoomRecord,
  type StoredBoardgameSnapshot
} from "./schema";

export interface RoomRepository {
  createRoom(input: CreateRoomInput): RoomRecord;
  getRoom(id: string): RoomRecord | null;
  saveBoardgameSnapshot(roomId: string, snapshot: StoredBoardgameSnapshot): RoomRecord;
  listRooms(): RoomRecord[];
}

export class InMemoryRoomRepository implements RoomRepository {
  private readonly rooms = new Map<string, RoomRecord>();

  createRoom(input: CreateRoomInput): RoomRecord {
    const room = createRoomRecord(input);
    this.rooms.set(room.id, room);
    return room;
  }

  getRoom(id: string): RoomRecord | null {
    return this.rooms.get(id) ?? null;
  }

  saveBoardgameSnapshot(roomId: string, snapshot: StoredBoardgameSnapshot): RoomRecord {
    const current = this.rooms.get(roomId);

    if (!current) {
      throw new Error(`Room not found: ${roomId}`);
    }

    const next: RoomRecord = {
      ...current,
      mediaSource: snapshot.state.mediaSource,
      calibration: snapshot.state.calibration,
      users: snapshot.state.users,
      assets: snapshot.state.assets,
      boardgameSnapshot: snapshot,
      updatedAt: new Date().toISOString()
    };

    this.rooms.set(roomId, next);
    return next;
  }

  listRooms(): RoomRecord[] {
    return Array.from(this.rooms.values());
  }
}

export function createInitialSessionForRoom(args: {
  roomId: string;
  title: string;
  users?: Record<string, RoomUser>;
  assets?: Record<string, PieceAsset>;
  now?: string;
}): TabletopSessionState {
  return createEmptySessionState({
    sessionId: args.roomId,
    title: args.title,
    ...(args.users ? { users: args.users } : {}),
    ...(args.assets ? { assets: args.assets } : {}),
    ...(args.now ? { now: args.now } : {})
  });
}
