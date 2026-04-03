import type { TabletopSessionState } from "../ghostboard-shared";

export type LocalTabletopClientConfig = {
  matchID: string;
  playerID: string;
  debug: boolean;
  initialState?: TabletopSessionState;
};

export const TabletopSessionBoard = null;

export function createLocalTabletopClientConfig(matchID: string, playerID: string): LocalTabletopClientConfig {
  return {
    matchID,
    playerID,
    debug: false
  };
}
