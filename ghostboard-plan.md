# GhostBoard Implementation Plan

> For Hermes: Use subagent-driven-development skill to implement this plan task-by-task.

Goal: Build a reusable tabletop simulator platform where a host loads a real-world tabletop image as the background, calibrates the visible play surface, and places imported digital pieces on top, with boardgame.io providing authoritative shared state for all durable session data.

Architecture: The MVP is a synchronized collaborative tabletop editor, not a full rules engine and not a computer-vision system. boardgame.io owns durable multiplayer state such as room metadata, calibration, assets, piece instances, and committed transforms. The client owns ephemeral UI/editor state such as selection, hover, drag previews, and active tools. The media layer is presentation only: in MVP it is a still image, not a live stream.

Tech Stack: TypeScript, React or Next.js frontend, boardgame.io server/client, Canvas or Konva overlay rendering, SQLite or PostgreSQL for persistence, local object storage or disk-backed uploads for table images and piece assets.

---

## Executive summary

This plan intentionally narrows the first version to the smallest product that proves the concept:
- upload a tabletop image
- manually calibrate the table area
- place and manipulate digital pieces in normalized board space
- synchronize those pieces across clients with boardgame.io
- persist and restore sessions

This version does not attempt livestream ingest, automatic piece detection, OCR, hidden-hand rules, or game-specific mechanics.

If this MVP feels good, phase 2 can add livestream video as an alternate background source using the exact same overlay and state system.

---

## Product definition

The product is a general tabletop session platform.

A host:
1. creates a room
2. uploads a photo of a real tabletop
3. calibrates the playable area using four corner points
4. imports digital pieces from a built-in asset library
5. drags pieces onto the table

Other users:
- join the room
- see the same image background and the same digital piece layout
- move pieces if their role allows it
- reconnect and recover the saved session state

This is not a game rules engine in the first phase. It is a general synchronized tabletop substrate.

---

## Explicit MVP scope

### In scope
- Room creation and join flow
- Host-uploaded tabletop image background
- Manual four-corner calibration
- Built-in default digital assets
- Create, move, rotate, lock, unlock, delete, and reorder pieces
- Spectator read-only mode
- Host and editor permissions
- Persistent saved sessions
- Resize-safe overlay rendering
- boardgame.io synchronization of durable state

### Out of scope for MVP
- Livestream video backgrounds
- In-app camera capture
- WebRTC/HLS media transport
- Automatic CV-based calibration
- Automatic piece detection from images/video
- OCR and card parsing
- Hidden information / per-player secret zones
- Multi-select
- Batch operations
- Stacks/groups as first-class entities
- User-uploaded SVG support
- Game-specific turn/rule logic

### Phase 2 candidates
- Livestream video mode
- User-uploaded custom piece assets
- CV-assisted calibration
- CV-assisted piece recognition
- Hidden/private zones
- Grouping and stacks
- Per-game plugins

---

## Key architectural decisions

1. boardgame.io is for durable shared state, not transient UI state.
2. The canonical coordinate space is normalized board space, never screen pixels.
3. The MVP background source is a still image only.
4. Calibration is mandatory before piece placement.
5. Piece overlay behavior is identical across clients regardless of viewport size.
6. Livestream support is deferred until the image-based workflow is solid.

---

## boardgame.io responsibility boundaries

### boardgame.io should own
- room/session metadata
- player roles
- media source metadata
- calibration data
- asset registry for the room
- piece instances
- committed piece transforms
- locking state
- z-order
- persistence snapshots or serialized session state

### Client-local UI state should own
- hovered piece
- selected piece
- active tool mode
- drag-in-progress state
- drag preview position
- resize/rotation handles
- context menus
- local panel visibility

Important rule: do not store `selectedPieceIds` in canonical synchronized session state. Selection is per-user UI state.

---

## Coordinate spaces

Define these spaces explicitly.

### 1. Intrinsic media space
Coordinates in the uploaded image’s native pixel dimensions.
Example: `(0..4032, 0..3024)`.

### 2. Rendered media space
Coordinates of the image as displayed in the browser after layout, scaling, and `object-fit` behavior.
Example: the image is rendered into a letterboxed rectangle inside the stage.

### 3. Calibrated board space
A normalized rectangular coordinate system mapped from the visible tabletop.
For MVP use `(0..1, 0..1)`.

### 4. Piece local space
The local transform space for a piece asset around its pivot/anchor point.

Canonical storage uses calibrated board space only.

---

## Calibration model

The host defines four corners on the rendered image:
- topLeft
- topRight
- bottomRight
- bottomLeft

These corners describe the visible tabletop region.

### MVP calibration decision
For MVP, support general four-corner perspective distortion with a projective transform / homography. Do not describe this as affine-only. If implementation simplicity becomes a problem, explicitly constrain camera usage to near-top-down images, but do not mix both assumptions in the same design.

### Calibration data

```ts
export type Vec2 = {
  x: number;
  y: number;
};

export type Quad = {
  topLeft: Vec2;
  topRight: Vec2;
  bottomRight: Vec2;
  bottomLeft: Vec2;
};

export type TableCalibration = {
  mediaWidth: number;
  mediaHeight: number;
  tableQuadMediaPx: Quad;
  normalizedWidth: number;
  normalizedHeight: number;
  transformVersion: 'homography-v1';
  createdAt: string;
  updatedAt: string;
};
```

Important:
- Store calibration in intrinsic media coordinates, not screen coordinates.
- Recompute rendering against the current displayed image rectangle on every client.
- If the media source changes, invalidate calibration and require recalibration.

### Calibration UX requirements
- Four draggable handles
- Magnified corner preview if needed
- Reset button
- Save button
- Visible grid preview after calibration
- Warning if polygon is self-crossing or degenerate

---

## Piece model

Use a deliberately small piece model for MVP.

```ts
export type PieceAsset = {
  id: string;
  name: string;
  imageUrl: string;
  width: number;
  height: number;
  tags: string[];
};

export type PieceInstance = {
  id: string;
  assetId: string;
  ownerId: string | null;
  position: Vec2; // normalized board coordinates
  rotationDeg: number;
  scale: number;
  zIndex: number;
  locked: boolean;
  pivot: 'center';
  metadata: Record<string, string | number | boolean>;
};
```

### Piece semantics
- Position is the center point of the piece for MVP.
- Pivot is always center for MVP.
- Scale is a unitless multiplier relative to the asset’s default render size.
- Pieces may be placed slightly outside the board only if explicitly allowed; otherwise clamp to board bounds.
- Stacking is not part of MVP; z-order only.

---

## Role and permission model

Use a simple explicit role system.

```ts
export type SessionRole = 'host' | 'editor' | 'spectator';
```

### Permissions
- host
  - can upload/replace tabletop image
  - can set calibration
  - can add/remove built-in assets from the session
  - can move any unlocked piece
  - can lock/unlock any piece
  - can change user roles
- editor
  - can create pieces
  - can move any unlocked piece
  - can rotate pieces
  - can delete pieces they created, or all pieces if you choose the simpler rule
- spectator
  - read-only

For MVP, use the simplest consistent rule: editors can manipulate any unlocked piece. Add ownership restrictions later only if needed.

---

## Persistence model

Decide this early: boardgame.io is the authority for multiplayer state, but persistence may be implemented through either:
1. boardgame.io storage adapter only
2. a thin application DB layer that stores room metadata plus serialized boardgame.io session state

Recommended MVP choice:
- use a thin application DB layer for rooms and uploaded media metadata
- persist serialized boardgame.io game state snapshots alongside room records

Persist:
- room id
- room title
- uploaded image metadata
- calibration
- session roles
- assets available in the room
- piece instances
- last updated timestamp

---

## Media model

MVP supports uploaded still images only.

```ts
export type MediaSource = {
  kind: 'image';
  assetUrl: string;
  width: number;
  height: number;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
};
```

### Upload constraints
- Table image max size: 25 MB
- Allowed MIME types: PNG, JPEG, WebP
- Reject SVG in MVP
- Normalize EXIF orientation on upload
- Extract width and height server-side

### Why image-only MVP
This proves the core product without opening livestream infrastructure problems such as:
- stream auth
- ingest pipeline
- low-latency playback
- reconnect logic
- resolution changes
- browser media quirks

---

## Interaction model

This is the most important synchronization decision.

### MVP choice
Use optimistic local dragging with commit-on-drop or low-frequency throttled updates.

Recommended first implementation:
- while dragging, show movement locally only
- on drag end, send `updatePieceTransform`
- remote clients receive the committed final transform

Optional improvement after core flow works:
- throttle drag updates to 5–10 updates/sec for smoother collaboration

This avoids flooding boardgame.io with high-frequency move spam during early implementation.

---

## Rendering model

Render in three layers:
1. background image layer
2. optional calibration/debug overlay
3. piece overlay layer

The piece overlay always computes current screen position from:
- current rendered image rectangle
- intrinsic image dimensions
- calibration transform
- piece normalized coordinates

Never persist screen coordinates.

---

## Proposed repository layout

If building greenfield in `workspace/ghostboard`:

- package.json
- pnpm-workspace.yaml
- apps/web/package.json
- apps/web/src/app/table/[matchId]/page.tsx
- apps/web/src/components/tabletop/MediaStage.tsx
- apps/web/src/components/tabletop/CalibrationEditor.tsx
- apps/web/src/components/tabletop/OverlayCanvas.tsx
- apps/web/src/components/tabletop/PiecePalette.tsx
- apps/web/src/components/tabletop/PieceInspector.tsx
- apps/web/src/components/tabletop/RoomSidebar.tsx
- apps/web/src/lib/boardgame/client.ts
- apps/web/src/lib/tabletop/geometry.ts
- apps/web/src/lib/tabletop/calibration.ts
- apps/web/src/lib/tabletop/assets.ts
- apps/web/src/lib/tabletop/uploads.ts
- apps/server/package.json
- apps/server/src/index.ts
- apps/server/src/games/tabletopSessionGame.ts
- apps/server/src/db/schema.ts
- apps/server/src/db/rooms.ts
- packages/shared/src/tabletop.ts
- tests/tabletop/sessionGame.test.ts
- tests/tabletop/geometry.test.ts
- tests/tabletop/calibration.test.ts
- tests/tabletop/permissions.test.ts
- tests/tabletop/persistence.test.ts

---

## Core shared types

```ts
export type Vec2 = { x: number; y: number };

export type Quad = {
  topLeft: Vec2;
  topRight: Vec2;
  bottomRight: Vec2;
  bottomLeft: Vec2;
};

export type SessionRole = 'host' | 'editor' | 'spectator';

export type MediaSource = {
  kind: 'image';
  assetUrl: string;
  width: number;
  height: number;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
};

export type TableCalibration = {
  mediaWidth: number;
  mediaHeight: number;
  tableQuadMediaPx: Quad;
  normalizedWidth: number;
  normalizedHeight: number;
  transformVersion: 'homography-v1';
  createdAt: string;
  updatedAt: string;
};

export type PieceAsset = {
  id: string;
  name: string;
  imageUrl: string;
  width: number;
  height: number;
  tags: string[];
};

export type PieceInstance = {
  id: string;
  assetId: string;
  ownerId: string | null;
  position: Vec2;
  rotationDeg: number;
  scale: number;
  zIndex: number;
  locked: boolean;
  pivot: 'center';
  metadata: Record<string, string | number | boolean>;
};

export type RoomUser = {
  userId: string;
  role: SessionRole;
  displayName: string;
};

export type TabletopSessionState = {
  mediaSource: MediaSource | null;
  calibration: TableCalibration | null;
  assets: Record<string, PieceAsset>;
  pieces: Record<string, PieceInstance>;
  users: Record<string, RoomUser>;
};
```

---

## boardgame.io game design

Use one generic game called `TabletopSessionGame`.

### setup
Initial state:
- no media source
- no calibration
- seeded built-in assets optional
- no pieces
- known users/roles populated from room context or lobby flow

### phases
Keep phases minimal:
- `lobby`
- `setup`
- `live`

### Moves
Only include durable, validated mutations.

```ts
const moves = {
  setMediaSource,
  setCalibration,
  addBuiltInAsset,
  createPiece,
  updatePieceTransform,
  setPieceLocked,
  movePieceToTop,
  movePieceToBottom,
  deletePiece,
  setUserRole,
};
```

### Validation rules
- Only host can call `setMediaSource`
- Only host can call `setCalibration`
- Host can change roles
- Spectator cannot mutate pieces
- Locked pieces cannot be moved by editors
- Piece transforms must remain finite and in allowed bounds

### Example move contract

```ts
createPiece(args: {
  id: string;
  assetId: string;
  position: Vec2;
  rotationDeg: number;
  scale: number;
  zIndex: number;
})

updatePieceTransform(args: {
  id: string;
  position?: Vec2;
  rotationDeg?: number;
  scale?: number;
})
```

Do not include shared selection state in the game model.

---

## Geometry utilities

You need utilities for:
- converting rendered-screen points into intrinsic-media points
- converting intrinsic-media points into normalized board points
- converting normalized board points back into intrinsic-media points
- converting intrinsic-media points into rendered-screen points

Suggested API:

```ts
screenToMedia(pointPx, renderedMediaRect, intrinsicMediaSize) => mediaPoint
mediaToScreen(mediaPoint, renderedMediaRect, intrinsicMediaSize) => screenPoint
mediaToBoard(mediaPoint, calibration) => boardPoint
boardToMedia(boardPoint, calibration) => mediaPoint
boardToScreen(boardPoint, calibration, renderedMediaRect, intrinsicMediaSize) => screenPoint
screenToBoard(screenPoint, calibration, renderedMediaRect, intrinsicMediaSize) => boardPoint
```

Critical note: tests must include skewed quadrilaterals and responsive layout changes. A square-only round-trip test is not enough.

---

## Default asset library

Seed a tiny built-in piece library.

```ts
export const DEFAULT_ASSETS: PieceAsset[] = [
  { id: 'pawn-red', name: 'Red Pawn', imageUrl: '/pieces/pawn-red.png', width: 128, height: 128, tags: ['pawn'] },
  { id: 'pawn-blue', name: 'Blue Pawn', imageUrl: '/pieces/pawn-blue.png', width: 128, height: 128, tags: ['pawn'] },
  { id: 'cube-green', name: 'Green Cube', imageUrl: '/pieces/cube-green.png', width: 128, height: 128, tags: ['cube'] },
  { id: 'token-gold', name: 'Gold Token', imageUrl: '/pieces/token-gold.png', width: 128, height: 128, tags: ['token'] },
  { id: 'card-back', name: 'Card Back', imageUrl: '/pieces/card-back.png', width: 256, height: 384, tags: ['card'] },
];
```

Do not add custom asset upload until the built-in library flow is stable.

---

## Detailed implementation tasks

### Task 1: Scaffold shared types and role model

Objective: Establish a stable shared schema before building UI.

Files:
- Create: `packages/shared/src/tabletop.ts`
- Test: `tests/tabletop/types-smoke.test.ts`

Step 1: Write a failing smoke test for `TabletopSessionState`, `SessionRole`, and `PieceInstance`.

Step 2: Run:
`pnpm vitest tests/tabletop/types-smoke.test.ts`
Expected: FAIL.

Step 3: Implement the shared types shown above.

Step 4: Re-run the test.
Expected: PASS.

Step 5: Commit.

```bash
git add packages/shared/src/tabletop.ts tests/tabletop/types-smoke.test.ts
git commit -m "feat: add shared tabletop domain types"
```

### Task 2: Define persistence schema and room lifecycle

Objective: Lock in room/session storage before interaction code grows.

Files:
- Create: `apps/server/src/db/schema.ts`
- Create: `apps/server/src/db/rooms.ts`
- Test: `tests/tabletop/persistence.test.ts`

Step 1: Write failing tests for:
- creating a room
- loading a room
- saving serialized session state
- restoring session state

Step 2: Implement room schema containing:
- room id
- room title
- media metadata
- serialized boardgame state
- timestamps

Step 3: Run:
`pnpm vitest tests/tabletop/persistence.test.ts`
Expected: PASS.

Step 4: Commit.

```bash
git add apps/server/src/db/schema.ts apps/server/src/db/rooms.ts tests/tabletop/persistence.test.ts
git commit -m "feat: add tabletop room persistence schema"
```

### Task 3: Create the generic boardgame.io game shell

Objective: Build the authoritative game model with role-aware move validation.

Files:
- Create: `apps/server/src/games/tabletopSessionGame.ts`
- Create: `apps/web/src/lib/boardgame/client.ts`
- Test: `tests/tabletop/sessionGame.test.ts`
- Test: `tests/tabletop/permissions.test.ts`

Step 1: Write failing tests for:
- empty setup state
- host-only media update
- spectator blocked from edits
- piece creation and transform updates

Step 2: Implement `TabletopSessionGame` with minimal phases and validated moves.

Step 3: Run:
`pnpm vitest tests/tabletop/sessionGame.test.ts tests/tabletop/permissions.test.ts`
Expected: PASS.

Step 4: Commit.

```bash
git add apps/server/src/games/tabletopSessionGame.ts apps/web/src/lib/boardgame/client.ts tests/tabletop/sessionGame.test.ts tests/tabletop/permissions.test.ts
git commit -m "feat: add authoritative tabletop session game"
```

### Task 4: Build image upload and media metadata handling

Objective: Support the only MVP background source: uploaded tabletop images.

Files:
- Create: `apps/web/src/lib/tabletop/uploads.ts`
- Create: `apps/server/src/routes/uploads.ts`
- Test: `tests/tabletop/uploads.test.ts`

Step 1: Write failing upload tests for PNG/JPEG/WebP acceptance and SVG rejection.

Step 2: Implement upload pipeline:
- validate MIME type
- normalize orientation
- extract width/height
- store media metadata
- return asset URL

Step 3: Run:
`pnpm vitest tests/tabletop/uploads.test.ts`
Expected: PASS.

Step 4: Commit.

```bash
git add apps/web/src/lib/tabletop/uploads.ts apps/server/src/routes/uploads.ts tests/tabletop/uploads.test.ts
git commit -m "feat: add tabletop image upload pipeline"
```

### Task 5: Build media stage with rendered-rect measurement

Objective: Render the uploaded image and expose accurate layout measurements for overlay math.

Files:
- Create: `apps/web/src/components/tabletop/MediaStage.tsx`
- Test: `apps/web/src/components/tabletop/MediaStage.test.tsx`

Step 1: Write failing tests for:
- empty state rendering
- image rendering
- rendered media rect reporting

Step 2: Implement `MediaStage` with a measured container and image element.

Step 3: Run:
`pnpm vitest apps/web/src/components/tabletop/MediaStage.test.tsx`
Expected: PASS.

Step 4: Commit.

```bash
git add apps/web/src/components/tabletop/MediaStage.tsx apps/web/src/components/tabletop/MediaStage.test.tsx
git commit -m "feat: add measured tabletop media stage"
```

### Task 6: Implement geometry and calibration utilities

Objective: Make the overlay mathematically stable across resizes and skewed table shapes.

Files:
- Create: `apps/web/src/lib/tabletop/geometry.ts`
- Create: `apps/web/src/lib/tabletop/calibration.ts`
- Test: `tests/tabletop/geometry.test.ts`
- Test: `tests/tabletop/calibration.test.ts`

Step 1: Write failing tests for:
- skewed quadrilateral mapping
- board-to-screen round-trips
- resize-safe coordinate stability
- invalid calibration rejection

Step 2: Implement transform utilities.

Step 3: Run:
`pnpm vitest tests/tabletop/geometry.test.ts tests/tabletop/calibration.test.ts`
Expected: PASS.

Step 4: Commit.

```bash
git add apps/web/src/lib/tabletop/geometry.ts apps/web/src/lib/tabletop/calibration.ts tests/tabletop/geometry.test.ts tests/tabletop/calibration.test.ts
git commit -m "feat: add calibration and geometry utilities"
```

### Task 7: Build manual calibration editor

Objective: Let the host define the board area on the uploaded image.

Files:
- Create: `apps/web/src/components/tabletop/CalibrationEditor.tsx`
- Test: `apps/web/src/components/tabletop/CalibrationEditor.test.tsx`

Step 1: Write failing tests for:
- rendering four handles
- dragging corners
- save action emitting intrinsic-media-space calibration
- invalid quad warning

Step 2: Implement host-only calibration editing UI.

Step 3: Run:
`pnpm vitest apps/web/src/components/tabletop/CalibrationEditor.test.tsx`
Expected: PASS.

Step 4: Commit.

```bash
git add apps/web/src/components/tabletop/CalibrationEditor.tsx apps/web/src/components/tabletop/CalibrationEditor.test.tsx
git commit -m "feat: add manual calibration editor"
```

### Task 8: Build piece palette and built-in assets flow

Objective: Allow users to place default pieces onto the calibrated board.

Files:
- Create: `apps/web/src/components/tabletop/PiecePalette.tsx`
- Create: `apps/web/src/lib/tabletop/assets.ts`
- Test: `apps/web/src/components/tabletop/PiecePalette.test.tsx`

Step 1: Write failing tests for:
- listing default assets
- creating a piece from an asset
- host/editor access to piece creation

Step 2: Implement built-in asset palette.

Step 3: Run:
`pnpm vitest apps/web/src/components/tabletop/PiecePalette.test.tsx`
Expected: PASS.

Step 4: Commit.

```bash
git add apps/web/src/components/tabletop/PiecePalette.tsx apps/web/src/lib/tabletop/assets.ts apps/web/src/components/tabletop/PiecePalette.test.tsx
git commit -m "feat: add built-in piece palette"
```

### Task 9: Build overlay canvas with local drag state and committed transforms

Objective: Render synchronized pieces while keeping transient interaction state local.

Files:
- Create: `apps/web/src/components/tabletop/OverlayCanvas.tsx`
- Test: `apps/web/src/components/tabletop/OverlayCanvas.test.tsx`

Step 1: Write failing tests for:
- piece rendering from normalized coordinates
- local drag preview behavior
- commit-on-drop transform dispatch
- locked piece immobility

Step 2: Implement overlay rendering and client-local interaction state.

Rules:
- local selection only
- local drag preview only
- dispatch transform move on drop
- do not write selected piece ids to boardgame.io state

Step 3: Run:
`pnpm vitest apps/web/src/components/tabletop/OverlayCanvas.test.tsx`
Expected: PASS.

Step 4: Commit.

```bash
git add apps/web/src/components/tabletop/OverlayCanvas.tsx apps/web/src/components/tabletop/OverlayCanvas.test.tsx
git commit -m "feat: add synchronized piece overlay canvas"
```

### Task 10: Compose the tabletop room page

Objective: Assemble the room into a coherent usable workflow.

Files:
- Create: `apps/web/src/app/table/[matchId]/page.tsx`
- Create: `apps/web/src/components/tabletop/RoomSidebar.tsx`
- Create: `apps/web/src/components/tabletop/PieceInspector.tsx`
- Test: `apps/web/src/app/table/[matchId]/page.test.tsx`

Step 1: Write a failing integration test for:
- room shell rendering
- image stage present
- calibration editor presence for host
- piece palette and overlay present

Step 2: Implement page composition.

Layout:
- left sidebar: room metadata and actions
- center: media stage + calibration editor + overlay
- right sidebar: piece palette + inspector

Step 3: Run:
`pnpm vitest apps/web/src/app/table/[matchId]/page.test.tsx`
Expected: PASS.

Step 4: Commit.

```bash
git add apps/web/src/app/table/[matchId]/page.tsx apps/web/src/components/tabletop/RoomSidebar.tsx apps/web/src/components/tabletop/PieceInspector.tsx apps/web/src/app/table/[matchId]/page.test.tsx
git commit -m "feat: compose tabletop room page"
```

### Task 11: Add save, reload, and reconnect behavior

Objective: Ensure the room survives refresh and reconnection.

Files:
- Modify: `apps/server/src/index.ts`
- Modify: `apps/server/src/db/rooms.ts`
- Test: `tests/tabletop/reconnect.test.ts`

Step 1: Write failing tests for:
- restore on page reload
- room state reload after reconnect
- piece positions preserved exactly

Step 2: Implement room loading and session rehydration.

Step 3: Run:
`pnpm vitest tests/tabletop/reconnect.test.ts`
Expected: PASS.

Step 4: Commit.

```bash
git add apps/server/src/index.ts apps/server/src/db/rooms.ts tests/tabletop/reconnect.test.ts
git commit -m "feat: add tabletop reconnect and rehydration"
```

---

## Verification checklist

A build is MVP-complete only if all of the following are true:

1. A host can create a room.
2. A host can upload a tabletop image.
3. The image background renders correctly after refresh.
4. The host can calibrate four corners and save them.
5. Calibration is stored in intrinsic media coordinates.
6. A host or editor can add a built-in asset as a piece.
7. A piece renders at the correct place on different browser sizes.
8. A piece can be moved and rotated.
9. Locked pieces cannot be moved.
10. A spectator sees the session but cannot edit it.
11. A second client sees the same committed piece state.
12. Refreshing or reconnecting preserves room state.

---

## Risks and mitigations

### Risk: Overlay drift after resize
Mitigation: Never store screen coordinates. Recompute every render from normalized board coordinates plus current layout measurements.

### Risk: Calibration mismatch due to bad corner placement
Mitigation: Add grid preview, invalid-quad detection, reset flow, and easy recalibration.

### Risk: boardgame.io move spam during drag
Mitigation: Use commit-on-drop for MVP; add throttled streaming updates only later if needed.

### Risk: Upload security and malformed assets
Mitigation: Restrict MVP uploads to PNG/JPEG/WebP. Reject SVG. Validate MIME and normalize metadata server-side.

### Risk: Scope creep into livestream and CV
Mitigation: Keep them explicitly out of MVP and only start phase 2 after image mode is solid.

---

## Phase 2: livestream mode

After MVP is working, add a second media source type.

```ts
export type StreamMediaSource = {
  kind: 'stream';
  streamUrl: string;
  protocol: 'webrtc' | 'hls';
  width?: number;
  height?: number;
};
```

Do not implement this until the image-based workflow is validated.

Phase 2 questions to answer first:
- Is capture done in-app or externally?
- Which protocol is supported first?
- What latency target matters?
- How are auth and reconnection handled?
- How is calibration invalidated if the stream resolution changes?

---

## Recommended MVP milestone order

1. Shared types and room persistence
2. boardgame.io game shell with permissions
3. Image upload flow
4. Measured image stage
5. Calibration math
6. Calibration UI
7. Built-in piece palette
8. Overlay rendering and drag/drop
9. Room composition
10. Reconnect and persistence hardening

This order is intentionally designed to avoid rework and to postpone the hardest media problems.

---

## Final recommendation

The right first version of GhostBoard is:
- a static tabletop image
- manual calibration
- imported default digital pieces
- synchronized piece manipulation
- saved rooms

If that loop feels good, then livestream video becomes a straightforward media-layer expansion instead of a foundational risk.
