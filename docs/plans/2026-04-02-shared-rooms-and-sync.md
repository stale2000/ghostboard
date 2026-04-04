# Shared Rooms and Cross-User Sync Implementation Plan

> For Hermes: Use subagent-driven-development skill to implement this plan task-by-task.

Goal: Let a user create a GhostBoard room, share its URL, and have all connected users see synchronized tabletop state and interactions in real time.

Architecture: Promote the current demo into a real boardgame.io-backed multiplayer flow. The server will own authoritative room state and expose room-creation + room-join metadata endpoints, while the web client will stop using local sample session state and instead connect to the boardgame.io multiplayer transport using a room URL, a generated player identity, and server-issued credentials. Use URL possession as the baseline access model, with host/editor/spectator roles stored in game state and enforced by moves.

Tech Stack: boardgame.io server + lobby APIs, Next.js app router, existing @ghostboard/shared types, browser localStorage for lightweight player identity persistence, optional in-memory repo first with later persistence upgrade.

---

## Product decisions to lock before implementation

1. Room URL is the access token for MVP.
   - Anyone with `/table/[roomId]` can open the room.
   - No account system yet.
   - Host gets full control; joiners default to editor or spectator depending on join policy.

2. State authority lives on the server.
   - media source metadata
   - calibration
   - pieces
   - user list / roles
   - future chat / cursors / presence

3. Uploaded background images need a shared URL, not a browser object URL.
   - Current local object URLs cannot sync across users.
   - MVP should either:
     - use a server upload endpoint that stores files under server-managed static storage, or
     - use InsForge storage and persist the returned public URL.

4. boardgame.io transport should be the default sync path.
   - Avoid inventing a custom websocket sync layer when boardgame.io already provides state replication, credentials, and move delivery.

5. In-memory room persistence is acceptable for MVP dev, but the plan should keep a clean repository boundary so we can swap in SQLite/Postgres later.

---

## Phase 1: Make the server real enough to host rooms

### Task 1: Fix the server runtime scaffold so boardgame.io can boot

Objective: Replace the current placeholder server entry with a real boardgame.io server process and eliminate the import/runtime issues.

Files:
- Modify: `apps/server/src/index.ts`
- Modify: `apps/server/src/games/tabletopSessionGame.ts`
- Inspect/fix if needed: `apps/server/package.json`
- Test: add `apps/server/src/index.test.ts` or `apps/server/src/server.test.ts`

Implementation notes:
- Stop importing `INVALID_MOVE` from `boardgame.io/core` if that path is causing the current dev failure. Use the supported import path for the installed boardgame.io version.
- Create a `Server` instance from boardgame.io with `TabletopSessionGame`.
- Bind an HTTP server on a configurable port, e.g. `PORT=8000`.
- Expose a health route like `GET /healthz` using the same Node server if needed.

Verification:
- Run: `pnpm --filter @ghostboard/server dev`
- Expected: server starts cleanly and logs the game registration without module-resolution errors.

Commit:
- `git commit -m "feat: boot real boardgame.io server"`

### Task 2: Add a room service layer above the repository

Objective: Encapsulate room creation and room lookup logic so the API layer is thin.

Files:
- Create: `apps/server/src/services/rooms.ts`
- Modify: `apps/server/src/db/rooms.ts`
- Modify: `apps/server/src/db/schema.ts`
- Test: `apps/server/src/services/rooms.test.ts`

Implementation notes:
- Add a room slug/id generator, e.g. `gb-<shortid>`.
- Add room creation defaults:
  - title
  - initial assets
  - initial users map with host
  - optional join policy field if useful
- Return a response shape like:
  - `roomId`
  - `roomUrl`
  - `hostPlayerId`
  - `hostCredentials`
  - `state`
- Extend `RoomRecord` to include enough metadata to rehydrate boardgame.io setup data.

Verification:
- Unit test room creation and lookup.
- Ensure room IDs are unique and room URLs are deterministic from server base URL.

Commit:
- `git commit -m "feat: add room service layer"`

### Task 3: Expose HTTP endpoints for room creation and room bootstrap

Objective: Let the web app create rooms and fetch enough data to connect to an existing room URL.

Files:
- Create: `apps/server/src/http/routes.ts`
- Modify: `apps/server/src/index.ts`
- Test: `apps/server/src/http/routes.test.ts`

Endpoints for MVP:
- `POST /api/rooms`
  - body: `{ title?: string, displayName?: string }`
  - returns: `{ roomId, roomUrl, playerId, playerName, role, credentials }`
- `GET /api/rooms/:roomId/bootstrap?playerId=<id?>`
  - returns current room metadata plus a join identity if needed
- `GET /api/rooms/:roomId`
  - lightweight room metadata for page load

Implementation notes:
- If boardgame.io lobby APIs fit cleanly, use them. If not, keep a thin custom route layer for MVP.
- On room creation, also create the boardgame.io match with the same `roomId` so URLs and match IDs are identical.
- Store host credentials server-side only long enough to return them to creator.

Verification:
- `curl -X POST http://localhost:8000/api/rooms`
- `curl http://localhost:8000/api/rooms/<roomId>`
- Confirm responses contain a usable room URL and boardgame match identity.

Commit:
- `git commit -m "feat: add room creation and bootstrap routes"`

---

## Phase 2: Add shared media and state-safe moves

### Task 4: Replace local-only image URLs with shared upload URLs

Objective: Make uploaded tabletop images visible to every participant.

Files:
- Modify: `apps/web/src/lib/tabletop/uploads.ts`
- Create: `apps/server/src/http/uploads.ts` or `apps/web/src/app/api/uploads/route.ts` if proxying through web
- Modify: shared media types if needed in `packages/shared/src/tabletop.ts`
- Test: `apps/web/src/lib/tabletop/uploads.test.ts` or server upload tests

Implementation notes:
- Current `createLocalTabletopImageRecord` returns object URLs; that cannot work for multi-user rooms.
- Introduce a remote upload path:
  - upload image bytes
  - server/InsForge stores the asset
  - return persistent `assetUrl`, width, height, mime type
- Preserve local preview UX while promoting final state to a remote URL before calling `setMediaSource` move.

Verification:
- User A uploads image.
- User B opening same room sees the same background image.

Commit:
- `git commit -m "feat: add shared tabletop image uploads"`

### Task 5: Add presence and join moves to the game state

Objective: Track who is in the room and let late joiners appear in shared state.

Files:
- Modify: `packages/shared/src/tabletop.ts`
- Modify: `apps/server/src/games/tabletopSessionGame.ts`
- Modify: `apps/web/src/lib/ghostboard-shared.ts` if mirrored types must stay in sync
- Test: `apps/server/src/games/tabletopSessionGame.test.ts`

Implementation notes:
- Add explicit moves such as:
  - `joinRoom({ userId, displayName })`
  - `leaveRoom({ userId })` or rely on ephemeral presence separately
  - `setUserRole({ userId, role })`
- Consider splitting durable room membership from ephemeral presence.
- Keep role enforcement in move handlers.

Verification:
- Two clients joining the same room should both appear in the sidebar users list.
- Host can reassign roles and both clients observe the change.

Commit:
- `git commit -m "feat: add room membership moves"`

### Task 6: Ensure all editable interactions flow through boardgame.io moves

Objective: Eliminate local-only mutations for media/calibration/pieces so every change replicates.

Files:
- Modify: `apps/web/src/components/tabletop/RoomDemoClient.tsx`
- Modify: `apps/web/src/lib/boardgame/client.ts`
- Modify: `apps/server/src/games/tabletopSessionGame.ts`
- Test: integration tests or move-level tests in `apps/server/src/games/tabletopSessionGame.test.ts`

Implementation notes:
- Current client mutates React local state directly.
- Replace with move dispatches:
  - `moves.setMediaSource(...)`
  - `moves.setCalibration(...)`
  - `moves.createPiece(...)`
  - `moves.updatePieceTransform(...)`
  - `moves.setPieceLocked(...)`
  - `moves.deletePiece(...)`
- Local UI state should be limited to transient drag state, file input state, selection state, optimistic loading state.
- Authoritative tabletop session state should come from boardgame.io `G`.

Verification:
- Open two browsers on same room URL.
- Upload image in browser A; browser B updates.
- Drag calibration corners in browser A; browser B updates.
- Add/move pieces; browser B updates in real time.

Commit:
- `git commit -m "feat: drive tabletop edits through synced moves"`

---

## Phase 3: Build the client-side room UX

### Task 7: Create a landing page to create or join rooms

Objective: Replace the demo-only entry with a real create-room flow.

Files:
- Modify: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/components/rooms/CreateRoomForm.tsx`
- Create: `apps/web/src/components/rooms/JoinRoomPanel.tsx`
- Test: component tests if available, otherwise manual verification steps in plan notes

Implementation notes:
- Page should support:
  - create room button/form
  - paste room URL or ID to join
  - redirect to `/table/[roomId]` after creation
- Persist returned identity data in localStorage keyed by room ID.

Verification:
- Create room from `/`.
- Redirect lands on `/table/<roomId>`.
- Refresh keeps same identity.

Commit:
- `git commit -m "feat: add room creation landing flow"`

### Task 8: Replace RoomDemoClient with a real multiplayer room client

Objective: Make the room page connect to server state instead of demo sample state.

Files:
- Modify heavily: `apps/web/src/components/tabletop/RoomDemoClient.tsx`
- Potential rename: `apps/web/src/components/tabletop/RoomClient.tsx`
- Modify: `apps/web/src/app/table/[matchId]/page.tsx`
- Modify: `apps/web/src/lib/boardgame/client.ts`
- Test: add client bootstrap tests where feasible

Implementation notes:
- Introduce boardgame.io `Client` with multiplayer config pointing at the server URL.
- On mount:
  - resolve room metadata from `GET /api/rooms/:roomId`
  - recover or mint local player identity from localStorage/bootstrap endpoint
  - connect boardgame client with `matchID`, `playerID`, `credentials`
- Subscribe React UI to boardgame.io state updates.
- Preserve existing UI sections (sidebar, media stage, calibration editor, piece palette, inspector) but feed them from synchronized `G`.

Verification:
- Page loads room state from server, not sample demo state.
- Refresh restores same room and same player role.

Commit:
- `git commit -m "feat: connect room page to multiplayer client"`

### Task 9: Add shareable room URL and participant UX affordances

Objective: Make the room obviously collaborative.

Files:
- Modify: `apps/web/src/components/tabletop/RoomSidebar.tsx`
- Modify: `apps/web/src/components/tabletop/CalibrationEditor.tsx`
- Modify: `apps/web/src/components/tabletop/PieceInspector.tsx`
- Optional create: `apps/web/src/components/rooms/ShareRoomCard.tsx`

Implementation notes:
- Show room URL with copy button.
- Show current user identity and role.
- Show connected participants.
- Clarify edit permissions:
  - host: full control
  - editor: piece interaction + maybe calibration if desired
  - spectator: read-only
- If only host should modify media/calibration, make that explicit in UI.

Verification:
- User can copy URL and send it.
- Recipient can open link and join shared session.

Commit:
- `git commit -m "feat: add room sharing and participant ui"`

---

## Phase 4: Verify cross-user synchronization and harden MVP

### Task 10: Add end-to-end multiplayer verification checklist

Objective: Prove the room feature works for multiple users.

Files:
- Create: `docs/testing/shared-rooms-manual-checklist.md`
- Optional create: Playwright spec if test setup exists

Manual test matrix:
1. Create room in browser A.
2. Open shared URL in browser B.
3. Verify both see same title and participants.
4. Upload image in A, verify B updates.
5. Auto-detect corners in A, verify B updates.
6. Drag corners in A, verify B updates live.
7. Add/move pieces in A, verify B updates.
8. Refresh browser B, verify state reloads correctly.
9. Refresh browser A, verify creator identity is restored.
10. Join browser C as spectator and confirm read-only behavior.

Commit:
- `git commit -m "docs: add shared room verification checklist"`

### Task 11: Add persistence seam for post-MVP durability

Objective: Prevent MVP architecture from trapping the project in memory-only rooms.

Files:
- Modify: `apps/server/src/db/rooms.ts`
- Create: `apps/server/src/db/sqliteRooms.ts` or placeholder interface docs
- Modify: `apps/server/src/index.ts`

Implementation notes:
- Keep `RoomRepository` interface stable.
- Document how to swap `InMemoryRoomRepository` with SQLite/Postgres.
- If time permits, persist room metadata and board snapshots to SQLite.

Verification:
- Repository implementation can be changed without touching routes or client code.

Commit:
- `git commit -m "refactor: preserve repository seam for durable rooms"`

---

## Recommended sequencing for actual implementation

1. Boot real boardgame.io server.
2. Add room creation/bootstrap API.
3. Add shared image upload path.
4. Replace local client state with boardgame.io client state.
5. Add landing page room creation flow.
6. Validate two-browser synchronization.
7. Only then improve persistence and polish.

---

## Risks and mitigations

### Risk: object URL uploads break multi-user sync
Mitigation: make remote/shared asset storage a first-class requirement before claiming rooms are collaborative.

### Risk: room access without auth is too permissive
Mitigation: treat URL possession as MVP capability access only; add signed invite tokens or auth later without changing room state architecture.

### Risk: boardgame.io lobby/credential model may feel awkward for anonymous users
Mitigation: keep a thin GhostBoard room bootstrap endpoint that hides boardgame.io details from the UI and stores credentials in localStorage.

### Risk: current duplicated web/insforge app codepaths drift again
Mitigation: after rooms land, either:
- generate `insforge-app` from `apps/web`, or
- collapse to one app target, or
- share more code through a package rather than copy-pasting app components.

---

## Acceptance criteria

The feature is complete when:
- a user can create a room from the app
- the app redirects to a unique room URL
- another user can open that URL and join without manual setup
- both users see the same shared tabletop state
- media upload, calibration, and piece changes replicate live between clients
- refresh does not destroy the room immediately during local development
- role-based permissions are enforced on synchronized moves

---

## Concrete implementation recommendation

For MVP, implement this exact access model:
- room creator becomes host
- joiners default to editor
- spectator mode can be selected via a UI toggle or later host reassignment
- room URL alone grants entry
- player identity is anonymous and stored in localStorage per room
- boardgame.io credentials are issued by `POST /api/rooms` and `GET /api/rooms/:id/bootstrap`

This is the fastest path to true shared rooms without building a full auth system first.
