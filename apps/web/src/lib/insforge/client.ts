import { createClient } from "@insforge/sdk";

export type GhostBoardInsforgeConfig = {
  projectName: string;
  baseUrl: string;
  anonKey: string;
  region: string;
  appkey: string;
  publicConfig?: unknown;
};

export function createGhostBoardInsforgeClient(config: GhostBoardInsforgeConfig) {
  return createClient({
    baseUrl: config.baseUrl,
    anonKey: config.anonKey
  });
}
