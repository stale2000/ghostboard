import { createGhostBoardInsforgeClient } from "./client";
import { createAssetLibrary } from "../tabletop/assets";
import {
  createEmptySessionState,
  type RoomUser,
  type SessionRole,
  type TabletopSessionState
} from "../ghostboard-shared";

const roomAssetLibrary = createAssetLibrary();
const ROOM_IDENTITY_STORAGE_KEY = "ghostboard-insforge-room-identities";
const browserInsforgeBaseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL?.trim();
const browserInsforgeAnonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY?.trim();

export type StoredRoomIdentity = {
  roomId: string;
  userId: string;
  displayName: string;
  role: SessionRole;
};

type GhostboardRoomRow = {
  id: string;
  title: string;
  state: TabletopSessionState;
  created_at: string;
  updated_at: string;
};

function getInsforgeClient() {
  if (!browserInsforgeBaseUrl || !browserInsforgeAnonKey) {
    throw new Error("GhostBoard is missing NEXT_PUBLIC_INSFORGE_URL or NEXT_PUBLIC_INSFORGE_ANON_KEY.");
  }

  return createGhostBoardInsforgeClient({
    projectName: "GhostBoard",
    baseUrl: browserInsforgeBaseUrl,
    anonKey: browserInsforgeAnonKey,
    region: "linked",
    appkey: "linked"
  });
}

function parseStoredIdentities(): Record<string, StoredRoomIdentity> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(ROOM_IDENTITY_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, StoredRoomIdentity>) : {};
  } catch {
    return {};
  }
}

function storeRoomIdentity(identity: StoredRoomIdentity) {
  if (typeof window === "undefined") {
    return;
  }

  const next = parseStoredIdentities();
  next[identity.roomId] = identity;
  window.localStorage.setItem(ROOM_IDENTITY_STORAGE_KEY, JSON.stringify(next));
}

export function createRoomId(): string {
  return Math.random().toString(36).slice(2, 13);
}

export function createGuestName(prefix = "Guest"): string {
  return `${prefix} ${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function createUser(userId: string, displayName: string, role: SessionRole): RoomUser {
  return { userId, displayName, role };
}

function createInitialSessionState(args: { roomId: string; title: string; host: StoredRoomIdentity }): TabletopSessionState {
  const session = createEmptySessionState({
    sessionId: args.roomId,
    title: args.title,
    users: { [args.host.userId]: createUser(args.host.userId, args.host.displayName, args.host.role) },
    assets: roomAssetLibrary.byId
  });
  session.updatedAt = new Date().toISOString();
  return session;
}

export async function createRoom(args: { title: string; displayName: string }): Promise<StoredRoomIdentity> {
  const client = getInsforgeClient();
  const roomId = createRoomId();
  const hostIdentity: StoredRoomIdentity = {
    roomId,
    userId: `user-${Math.random().toString(36).slice(2, 10)}`,
    displayName: args.displayName,
    role: "host"
  };
  const state = createInitialSessionState({
    roomId,
    title: args.title,
    host: hostIdentity
  });

  const { error } = await client.database.from("ghostboard_rooms").insert([
    {
      id: roomId,
      title: args.title,
      state,
      updated_at: new Date().toISOString()
    }
  ]);

  if (error) {
    throw new Error(error.message || "GhostBoard could not create a room in InsForge.");
  }

  storeRoomIdentity(hostIdentity);
  return hostIdentity;
}

export function getStoredRoomIdentity(roomId: string): StoredRoomIdentity | null {
  return parseStoredIdentities()[roomId] ?? null;
}

export function ensureRoomIdentity(roomId: string): StoredRoomIdentity {
  const existing = getStoredRoomIdentity(roomId);
  if (existing) {
    return existing;
  }

  const identity: StoredRoomIdentity = {
    roomId,
    userId: `user-${Math.random().toString(36).slice(2, 10)}`,
    displayName: createGuestName("Player"),
    role: "editor"
  };
  storeRoomIdentity(identity);
  return identity;
}

export async function fetchRoom(roomId: string): Promise<GhostboardRoomRow | null> {
  const client = getInsforgeClient();
  const { data, error } = await client.database.from("ghostboard_rooms").select("*").eq("id", roomId).limit(1);
  if (error) {
    throw new Error(error.message || "GhostBoard could not fetch the room from InsForge.");
  }

  const row = Array.isArray(data) ? (data[0] as GhostboardRoomRow | undefined) : null;
  return row ?? null;
}

export async function ensureRoomMembership(roomId: string, identity: StoredRoomIdentity): Promise<TabletopSessionState> {
  const row = await fetchRoom(roomId);
  if (!row) {
    throw new Error(`Room not found: ${roomId}`);
  }

  const session = row.state;
  if (!session.assets || Object.keys(session.assets).length === 0) {
    session.assets = roomAssetLibrary.byId;
  }

  if (!session.users[identity.userId]) {
    session.users[identity.userId] = createUser(identity.userId, identity.displayName, identity.role);
    session.updatedAt = new Date().toISOString();
    await saveRoomState(roomId, row.title, session);
  }

  return session;
}

export async function saveRoomState(roomId: string, title: string, state: TabletopSessionState): Promise<void> {
  const client = getInsforgeClient();
  state.updatedAt = new Date().toISOString();

  const { error } = await client.database
    .from("ghostboard_rooms")
    .update({
      title,
      state,
      updated_at: state.updatedAt
    })
    .eq("id", roomId);

  if (error) {
    throw new Error(error.message || "GhostBoard could not save room state to InsForge.");
  }
}
