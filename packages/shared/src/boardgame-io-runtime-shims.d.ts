declare module "boardgame.io/dist/cjs/core.js" {
  export const INVALID_MOVE: "INVALID_MOVE";
}

declare module "boardgame.io/dist/cjs/server.js" {
  export const Origins: {
    LOCALHOST: RegExp;
    LOCALHOST_IN_DEVELOPMENT: boolean | RegExp;
  };
  export function Server(...args: any[]): any;
}
