import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

export type LinkedInsforgeProject = {
  projectId: string;
  projectName: string;
  orgId: string;
  appkey: string;
  region: string;
  apiKey: string;
  ossHost: string;
};

type RawLinkedInsforgeProject = {
  project_id?: string;
  project_name?: string;
  org_id?: string;
  appkey?: string;
  region?: string;
  api_key?: string;
  oss_host?: string;
};

function getProjectFilePath(): string {
  return path.resolve(process.cwd(), "..", "..", ".insforge", "project.json");
}

export async function readLinkedInsforgeProject(): Promise<LinkedInsforgeProject | null> {
  try {
    const raw = await readFile(getProjectFilePath(), "utf8");
    const parsed = JSON.parse(raw) as RawLinkedInsforgeProject;

    if (
      !parsed.project_id ||
      !parsed.project_name ||
      !parsed.org_id ||
      !parsed.appkey ||
      !parsed.region ||
      !parsed.api_key ||
      !parsed.oss_host
    ) {
      return null;
    }

    return {
      projectId: parsed.project_id,
      projectName: parsed.project_name,
      orgId: parsed.org_id,
      appkey: parsed.appkey,
      region: parsed.region,
      apiKey: parsed.api_key,
      ossHost: parsed.oss_host
    };
  } catch {
    return null;
  }
}
