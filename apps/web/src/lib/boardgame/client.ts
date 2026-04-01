import { Client as ReactClient } from "boardgame.io/react";

import type { TabletopSessionState } from "@ghostboard/shared";

import { TabletopSessionGame } from "../../../../server/src/games/tabletopSessionGame";

export const TabletopSessionBoard = ReactClient<TabletopSessionState>({
  game: TabletopSessionGame,
  debug: false
});

export function createLocalTabletopClientConfig(matchID: string, playerID: string) {
  return {
    matchID,
    playerID,
    game: TabletopSessionGame,
    debug: false
  };
}
