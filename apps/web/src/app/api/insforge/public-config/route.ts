import { NextResponse } from "next/server";

import { readLinkedInsforgeProject } from "../../../../lib/insforge/project";

export const dynamic = "force-dynamic";

type AuthPublicConfigResponse = {
  data?: unknown;
};

type AnonTokenResponse = {
  anonKey?: string;
};

export async function GET() {
  const project = await readLinkedInsforgeProject();

  if (!project) {
    return NextResponse.json({ error: "No linked InsForge project was found for this repo." }, { status: 404 });
  }

  const headers = {
    Authorization: `Bearer ${project.apiKey}`
  };

  try {
    const [anonTokenResponse, authPublicConfigResponse] = await Promise.all([
      fetch(`${project.ossHost}/api/auth/tokens/anon`, {
        method: "POST",
        headers,
        cache: "no-store"
      }),
      fetch(`${project.ossHost}/api/auth/public-config`, {
        method: "GET",
        cache: "no-store"
      })
    ]);

    if (!anonTokenResponse.ok) {
      const details = await anonTokenResponse.text();
      return NextResponse.json(
        { error: `Failed to create an InsForge anon key for GhostBoard. ${details}` },
        { status: 502 }
      );
    }

    const anonToken = (await anonTokenResponse.json()) as AnonTokenResponse;
    const publicConfig = authPublicConfigResponse.ok
      ? ((await authPublicConfigResponse.json()) as AuthPublicConfigResponse)
      : null;

    if (!anonToken.anonKey) {
      return NextResponse.json({ error: "InsForge did not return an anon key." }, { status: 502 });
    }

    return NextResponse.json({
      projectName: project.projectName,
      projectId: project.projectId,
      appkey: project.appkey,
      region: project.region,
      baseUrl: project.ossHost,
      anonKey: anonToken.anonKey,
      publicConfig: publicConfig?.data ?? null
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "GhostBoard could not reach the linked InsForge project."
      },
      { status: 502 }
    );
  }
}
