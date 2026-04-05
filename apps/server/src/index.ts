import { Server } from "boardgame.io/dist/cjs/server.js";

import { TabletopSessionGame } from "./games/tabletopSessionGame.js";

const DEFAULT_PORT = Number(process.env.PORT ?? 8000);

export function createServerScaffold(): {
  router: { get: (path: string, handler: (ctx: { body?: unknown }) => void) => unknown };
  run: (port: number, callback?: () => void) => Promise<unknown>;
} {
  const server = Server({
    games: [TabletopSessionGame],
    origins: true,
    apiOrigins: true
  });

  server.app.use(async (ctx: { set: (key: string, value: string) => void; method: string; status?: number }, next: () => Promise<unknown>) => {
    ctx.set("Access-Control-Allow-Origin", "*");
    ctx.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    ctx.set("Access-Control-Allow-Headers", "content-type,authorization");

    if (ctx.method === "OPTIONS") {
      ctx.status = 204;
      return;
    }

    await next();
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
