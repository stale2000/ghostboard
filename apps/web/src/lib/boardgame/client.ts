import { Client, LobbyClient } from "boardgame.io/client";
import { SocketIO } from "boardgame.io/multiplayer";

import { TabletopSessionGame } from "@ghostboard/shared/game";
import type { TabletopSessionState } from "@ghostboard/shared/tabletop";

export const GHOSTBOARD_GAME_NAME = TabletopSessionGame.name ?? "tabletop-session";
export const GHOSTBOARD_MULTIPLAYER_SERVER = process.env.NEXT_PUBLIC_GHOSTBOARD_SERVER_URL?.trim() || "http://localhost:8000";
const ROOM_IDENTITY_STORAGE_KEY = "ghostboard-room-identities";
const MAX_ROOM_PLAYERS = 16;

export type StoredRoomIdentity = {
  roomId: string;
  playerID: string | null;
  credentials: string | null;
  playerName: string;
};

export function createLobbyClient() {
  return new LobbyClient({ server: GHOSTBOARD_MULTIPLAYER_SERVER });
}

export function createTabletopClient(args: { matchID: string; playerID: string | null; credentials?: string | null }) {
  const options: Parameters<typeof Client<TabletopSessionState>>[0] = {
    game: TabletopSessionGame,
    debug: false,
    matchID: args.matchID,
    multiplayer: SocketIO({ server: GHOSTBOARD_MULTIPLAYER_SERVER })
  };

  if (args.playerID !== null) {
    options.playerID = args.playerID;
  }

  if (args.credentials) {
    options.credentials = args.credentials;
  }

  return Client<TabletopSessionState>(options);
}

function parseStoredIdentities(): Record<string, StoredRoomIdentity> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(ROOM_IDENTITY_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, StoredRoomIdentity>;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export function getStoredRoomIdentity(roomId: string): StoredRoomIdentity | null {
  return parseStoredIdentities()[roomId] ?? null;
}

export function storeRoomIdentity(identity: StoredRoomIdentity) {
  if (typeof window === "undefined") {
    return;
  }

  const next = parseStoredIdentities();
  next[identity.roomId] = identity;
  window.localStorage.setItem(ROOM_IDENTITY_STORAGE_KEY, JSON.stringify(next));
}

export function createGuestName(prefix = "Guest"): string {
  return `${prefix} ${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function createRoom(args: { title: string; hostName: string }) {
  const lobbyClient = createLobbyClient();
  const created = await lobbyClient.createMatch(GHOSTBOARD_GAME_NAME, {
    numPlayers: MAX_ROOM_PLAYERS,
    setupData: {
      title: args.title
    }
  });
  const matchID = created.matchID;

  const joined = await lobbyClient.joinMatch(GHOSTBOARD_GAME_NAME, matchID, {
    playerID: "0",
    playerName: args.hostName
  });

  const identity: StoredRoomIdentity = {
    roomId: matchID,
    playerID: joined.playerID,
    credentials: joined.playerCredentials,
    playerName: args.hostName
  };

  storeRoomIdentity(identity);
  return identity;
}

export async function ensureRoomIdentity(roomId: string): Promise<StoredRoomIdentity> {
  const stored = getStoredRoomIdentity(roomId);
  if (stored) {
    return stored;
  }

  const lobbyClient = createLobbyClient();
  const match = await lobbyClient.getMatch(GHOSTBOARD_GAME_NAME, roomId);
  const openPlayer = match.players.find((player) => player.id !== undefined && !player.name);

  if (!openPlayer || openPlayer.id === undefined) {
    const spectator: StoredRoomIdentity = {
      roomId,
      playerID: null,
      credentials: null,
      playerName: createGuestName("Watcher")
    };
    storeRoomIdentity(spectator);
    return spectator;
  }

  const playerName = createGuestName("Player");
  const joined = await lobbyClient.joinMatch(GHOSTBOARD_GAME_NAME, roomId, {
    playerID: String(openPlayer.id),
    playerName
  });

  const identity: StoredRoomIdentity = {
    roomId,
    playerID: joined.playerID,
    credentials: joined.playerCredentials,
    playerName
  };
  storeRoomIdentity(identity);
  return identity;
}
