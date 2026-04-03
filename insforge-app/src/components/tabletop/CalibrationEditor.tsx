import type { TableCalibration, SessionRole } from "../../lib/ghostboard-shared";

type CalibrationEditorProps = {
  role: SessionRole;
  calibration: TableCalibration | null;
  onAutoDetect?: () => void | Promise<void>;
};

export function CalibrationEditor({ role, calibration, onAutoDetect }: CalibrationEditorProps) {
  const canEdit = role === "host";
  const quad = calibration?.tableQuadMediaPx;

  return (
    <section
      style={{
        background: "#fffbeb",
        border: "1px solid #fcd34d",
        borderRadius: 24,
        padding: 16
      }}
    >
      <div style={{ alignItems: "flex-start", display: "flex", gap: 16, justifyContent: "space-between" }}>
        <div>
          <h3 style={{ color: "#451a03", margin: 0 }}>Calibration Editor</h3>
          <p style={{ color: "#78350f", fontSize: 14 }}>
            GhostBoard calibration lives here. Corner points stay in intrinsic media pixels while piece coordinates stay in normalized board space.
          </p>
        </div>
        <div style={{ alignItems: "center", display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {canEdit && onAutoDetect ? (
            <button
              onClick={() => {
                void onAutoDetect();
              }}
              style={{
                background: "#f59e0b",
                border: "none",
                borderRadius: 999,
                color: "#111827",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                padding: "8px 12px"
              }}
              type="button"
            >
              Re-detect corners
            </button>
          ) : null}
          <span
            style={{
              background: "#ffffff",
              borderRadius: 999,
              color: "#92400e",
              fontSize: 12,
              fontWeight: 600,
              padding: "6px 10px"
            }}
          >
            {canEdit ? "Host editable" : "Read only"}
          </span>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          marginTop: 16
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #fcd34d",
            borderRadius: 18,
            color: "#334155",
            fontSize: 14,
            padding: 12
          }}
        >
          <p style={{ color: "#0f172a", fontWeight: 600, margin: 0 }}>Status</p>
          <p style={{ marginBottom: 0, marginTop: 6 }}>
            {calibration ? "Auto-detected quad ready for manual refinement" : "Calibration not saved yet"}
          </p>
        </div>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #fcd34d",
            borderRadius: 18,
            color: "#334155",
            fontSize: 14,
            padding: 12
          }}
        >
          <p style={{ color: "#0f172a", fontWeight: 600, margin: 0 }}>Board size</p>
          <p style={{ marginBottom: 0, marginTop: 6 }}>
            {calibration
              ? `0..${calibration.normalizedWidth} x 0..${calibration.normalizedHeight} normalized board space`
              : "Pending image upload"}
          </p>
        </div>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #fcd34d",
            borderRadius: 18,
            color: "#334155",
            fontSize: 14,
            padding: 12
          }}
        >
          <p style={{ color: "#0f172a", fontWeight: 600, margin: 0 }}>Corner seed</p>
          <p style={{ marginBottom: 0, marginTop: 6 }}>
            {quad
              ? `TL ${Math.round(quad.topLeft.x)},${Math.round(quad.topLeft.y)} • TR ${Math.round(quad.topRight.x)},${Math.round(quad.topRight.y)} • BR ${Math.round(quad.bottomRight.x)},${Math.round(quad.bottomRight.y)} • BL ${Math.round(quad.bottomLeft.x)},${Math.round(quad.bottomLeft.y)}`
              : "GhostBoard will auto-detect a rectangular play surface, then let the host drag corners into place."}
          </p>
        </div>
      </div>
    </section>
  );
}
