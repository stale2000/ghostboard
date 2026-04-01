# GhostBoard

This repository contains a lightweight pnpm workspace scaffold for the image-based MVP described in [ghostboard-plan.md](./ghostboard-plan.md).

## What exists

- `apps/web`: a Next.js room scaffold for a local image-only tabletop workflow
- `apps/server`: a minimal TypeScript server scaffold with a `boardgame.io` game definition and room persistence stubs
- `packages/shared`: shared domain types for sessions, calibration, roles, assets, pieces, and room users
- Lightweight geometry and calibration utilities, including a default calibration seed for uploaded tabletop images
- A small built-in asset library plus coherent sample room/session helpers for demo wiring

## What is intentionally stubbed

- No livestream or video support
- No real upload pipeline or file storage yet
- No real database adapter yet; room storage is currently an in-memory repository plus schema types
- No real homography implementation yet; calibration math currently uses placeholder rectangle mapping helpers
- No end-to-end boardgame.io server wiring yet; the game definition and server entrypoint are present, but transport/persistence integration still needs implementation
- No persisted media records yet; browser-selected tabletop images stay local as browser object URLs with metadata only
- No dedicated test harness yet in this scaffold; `pnpm typecheck` and `pnpm build` are the current verification gates

## Local image MVP behavior

- The room page lets a developer choose a tabletop image from the browser.
- The selected file is converted into a local in-memory/object-URL media record in `apps/web/src/lib/tabletop/uploads.ts`.
- That local media metadata updates the client-side sample session only.
- Default calibration metadata is seeded from the image dimensions in `apps/web/src/lib/tabletop/calibration.ts`.
- Calibration maps intrinsic media pixels into normalized board coordinates in the `0..1` range on both axes.
- Demo pieces appear only after an image exists, so the stage, calibration panel, overlay, sidebar, and inspector stay internally consistent.
- Nothing is uploaded, persisted, or sent to the server yet.

## Run the scaffold

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start the web and server dev processes:

   ```bash
   pnpm dev
   ```

3. Open `http://localhost:3000/table/demo-room` to exercise the local tabletop room scaffold.

4. Run the verification gates:

   ```bash
   pnpm typecheck
   pnpm build
   ```

## Files to extend next

- [apps/web/src/lib/tabletop/uploads.ts](./apps/web/src/lib/tabletop/uploads.ts): replace local object-URL records with a real upload/persistence path when ready
- [apps/web/src/lib/tabletop/sampleSession.ts](./apps/web/src/lib/tabletop/sampleSession.ts): evolve demo room/session seeding into lobby or restored-room data
- [apps/web/src/lib/tabletop/calibration.ts](./apps/web/src/lib/tabletop/calibration.ts): swap the default/inset seed and placeholder geometry for real homography math
- [apps/web/src/components/tabletop/RoomDemoClient.tsx](./apps/web/src/components/tabletop/RoomDemoClient.tsx): replace local client-owned state with real boardgame.io transport and server-backed room loading
- [apps/server/src/db/rooms.ts](./apps/server/src/db/rooms.ts): replace the in-memory repository with SQLite or PostgreSQL-backed persistence

## Current workspace overview

```text
apps/
  server/
  web/
packages/
  shared/
```

The current scaffold prioritizes type-safe boundaries, local-first demo wiring, and clear upgrade points over completeness.
