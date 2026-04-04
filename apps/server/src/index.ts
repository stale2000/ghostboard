import { Origins, Server } from "boardgame.io/dist/cjs/server.js";

import { TabletopSessionGame } from "./games/tabletopSessionGame.js";

const DEFAULT_PORT = Number(process.env.PORT ?? 8000);

export function createServerScaffold(): {
  router: { get: (path: string, handler: (ctx: { body?: unknown }) => void) => unknown };
  run: (port: number, callback?: () => void) => Promise<unknown>;
} {
  const server = Server({
    games: [TabletopSessionGame],
    origins: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "http://127.0.0.1:3002",
      Origins.LOCALHOST,
      Origins.LOCALHOST_IN_DEVELOPMENT
    ],
    apiOrigins: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "http://127.0.0.1:3002"
    ]
  });

  server.router.get("/healthz", (ctx: { body?: unknown }) => {
    ctx.body = {
      ok: true,
      gameName: TabletopSessionGame.name,
      timestamp: new Date().toISOString()
    };
  });

  return server;
}

if (process.env.NODE_ENV !== "test") {
  const server = createServerScaffold();

  void server.run(DEFAULT_PORT, () => {
    console.log(`[ghostboard/server] boardgame.io server listening on http://localhost:${DEFAULT_PORT}`);
    console.log(`[ghostboard/server] lobby api: http://localhost:${DEFAULT_PORT}/games/${TabletopSessionGame.name}`);
  });
}
