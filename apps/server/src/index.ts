import { InMemoryRoomRepository } from "./db/rooms";
import { TabletopSessionGame } from "./games/tabletopSessionGame";

export type ServerScaffold = {
  gameName: string;
  roomRepository: InMemoryRoomRepository;
};

export function createServerScaffold(): ServerScaffold {
  return {
    gameName: TabletopSessionGame.name ?? "tabletop-session",
    roomRepository: new InMemoryRoomRepository()
  };
}

if (process.env.NODE_ENV !== "test") {
  const scaffold = createServerScaffold();

  console.log(
    `[ghostboard/server] scaffold ready for game "${scaffold.gameName}". TODO: wire boardgame.io server, HTTP routes, persistence adapter, and uploads.`
  );
}
