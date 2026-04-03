import type { RoomUser } from "../../lib/ghostboard-shared";

type RoomSidebarProps = {
  matchId: string;
  roomTitle: string;
  users: RoomUser[];
  currentRole: RoomUser["role"];
  insforgeStatus: string;
  insforgeLabel: string;
  insforgeDetail: string;
  mediaLabel: string;
  calibrationLabel: string;
  assetCount: number;
  pieceCount: number;
  uploadControl?: React.ReactNode;
};

export function RoomSidebar({
  matchId,
  roomTitle,
  users,
  currentRole,
  insforgeStatus,
  insforgeLabel,
  insforgeDetail,
  mediaLabel,
  calibrationLabel,
  assetCount,
  pieceCount,
  uploadControl
}: RoomSidebarProps) {
  return (
    <aside
      style={{
        background: "linear-gradient(180deg, rgba(15, 23, 42, 0.96) 0%, rgba(17, 24, 39, 0.98) 100%)",
        border: "1px solid rgba(148, 163, 184, 0.25)",
        borderRadius: 28,
        boxShadow: "0 18px 50px rgba(2, 6, 23, 0.55)",
        padding: 20
      }}
    >
      <div>
        <p
          style={{
            color: "#7dd3fc",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.24em",
            margin: 0,
            textTransform: "uppercase"
          }}
        >
          GhostBoard Room
        </p>
        <h1 style={{ color: "#f8fafc", fontSize: 28, marginBottom: 0, marginTop: 8 }}>{roomTitle}</h1>
        <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 6 }}>Match ID: {matchId}</p>
        <p style={{ color: "#e2e8f0", fontSize: 14, marginTop: 6 }}>
          You are manifesting this GhostBoard demo as a <strong>{currentRole}</strong>.
        </p>
      </div>

      <div
        style={{
          background: "rgba(15, 23, 42, 0.72)",
          borderRadius: 20,
          marginTop: 24,
          padding: 16
        }}
      >
        <p style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600, margin: 0 }}>Participants</p>
        <ul style={{ color: "#cbd5e1", display: "grid", fontSize: 14, gap: 8, listStyle: "none", marginTop: 12, padding: 0 }}>
          {users.map((user) => (
            <li
              key={user.userId}
              style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}
            >
              <span>{user.displayName}</span>
              <span
                style={{
                  background: "rgba(148, 163, 184, 0.12)",
                  borderRadius: 999,
                  color: "#cbd5e1",
                  fontSize: 12,
                  padding: "6px 10px"
                }}
              >
                {user.role}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div
        style={{
          background: "rgba(15, 23, 42, 0.72)",
          borderRadius: 20,
          marginTop: 24,
          padding: 16
        }}
      >
        <p style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600, margin: 0 }}>GhostBoard image conduit</p>
        <p style={{ color: "#cbd5e1", fontSize: 14, marginBottom: 0, marginTop: 10 }}>{mediaLabel}</p>
        <p style={{ color: "#cbd5e1", fontSize: 14, marginBottom: 0, marginTop: 10 }}>{calibrationLabel}</p>
        {uploadControl ? <div style={{ marginTop: 16 }}>{uploadControl}</div> : null}
      </div>

      <div
        style={{
          background: "rgba(15, 23, 42, 0.72)",
          borderRadius: 20,
          marginTop: 24,
          padding: 16
        }}
      >
        <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
          <p style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600, margin: 0 }}>InsForge bond</p>
          <span
            style={{
              background: "rgba(34, 211, 238, 0.14)",
              border: "1px solid rgba(34, 211, 238, 0.18)",
              borderRadius: 999,
              color: "#a5f3fc",
              fontSize: 12,
              fontWeight: 600,
              padding: "6px 10px"
            }}
          >
            {insforgeStatus}
          </span>
        </div>
        <p style={{ color: "#cbd5e1", fontSize: 14, marginBottom: 0, marginTop: 10 }}>{insforgeLabel}</p>
        <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 0, marginTop: 10 }}>{insforgeDetail}</p>
      </div>

      <div
        style={{
          border: "1px dashed rgba(125, 211, 252, 0.35)",
          borderRadius: 20,
          color: "#cbd5e1",
          fontSize: 14,
          marginTop: 24,
          padding: 16
        }}
      >
        {assetCount} built-in spirit tokens are indexed for the room. {pieceCount} demo pieces appear after a local image is chosen so the overlay and inspector stay coherent with calibration state.
      </div>
    </aside>
  );
}
