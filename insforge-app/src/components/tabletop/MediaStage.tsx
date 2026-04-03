import type { MediaSource } from "../../lib/ghostboard-shared";

type MediaStageProps = {
  mediaSource: MediaSource | null;
  mediaLabel?: string | null;
  statusLabel?: string;
  emptyStateAction?: React.ReactNode;
  children?: React.ReactNode;
};

export function MediaStage({ mediaSource, mediaLabel, statusLabel, emptyStateAction, children }: MediaStageProps) {
  return (
    <section
      style={{
        background: "linear-gradient(180deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.94) 100%)",
        border: "1px solid rgba(125, 211, 252, 0.22)",
        borderRadius: 24,
        padding: 16,
        boxShadow: "0 18px 44px rgba(2, 6, 23, 0.45)"
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <div style={{ alignItems: "flex-start", display: "flex", gap: 12, justifyContent: "space-between" }}>
          <div>
            <h2 style={{ color: "#f8fafc", margin: 0, fontSize: 20 }}>Media Stage</h2>
            <p style={{ color: "#cbd5e1", fontSize: 14, marginBottom: 0 }}>
              GhostBoard projects digital pieces onto a still image of a real table. Livestream support is still out of scope for this scaffold.
            </p>
          </div>
          <div
            style={{
              background: "rgba(148, 163, 184, 0.12)",
              border: "1px solid rgba(148, 163, 184, 0.22)",
              borderRadius: 999,
              color: "#e2e8f0",
              fontSize: 12,
              fontWeight: 600,
              padding: "6px 10px"
            }}
          >
            {statusLabel ?? (mediaSource ? "Image ready" : "No image")}
          </div>
        </div>
        {mediaSource ? (
          <div
            style={{
              background: "rgba(15, 23, 42, 0.68)",
              border: "1px solid rgba(148, 163, 184, 0.22)",
              borderRadius: 16,
              color: "#cbd5e1",
              display: "grid",
              gap: 4,
              marginTop: 12,
              padding: 12
            }}
          >
            <span style={{ color: "#f8fafc", fontSize: 14, fontWeight: 600 }}>
              {mediaLabel ?? "GhostBoard local table image"}
            </span>
            <span style={{ fontSize: 13 }}>
              {mediaSource.width}x{mediaSource.height} intrinsic pixels • {mediaSource.mimeType}
            </span>
          </div>
        ) : null}
      </div>

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 420,
          overflow: "hidden",
          borderRadius: 18,
          border: "1px dashed rgba(125, 211, 252, 0.28)",
          background: "rgba(2, 6, 23, 0.55)"
        }}
      >
        {mediaSource ? (
          <>
            <img
              alt="Tabletop media"
              src={mediaSource.assetUrl}
              style={{ maxHeight: "70vh", objectFit: "contain", width: "100%" }}
            />
            {children ? <div style={{ inset: 0, pointerEvents: "none", position: "absolute" }}>{children}</div> : null}
          </>
        ) : (
          <div style={{ color: "#94a3b8", display: "grid", fontSize: 14, gap: 16, maxWidth: 560, padding: 24, textAlign: "center" }}>
            <div>
              No table image has been summoned yet. Choose one to let GhostBoard anchor pieces onto the play surface.
            </div>
            {emptyStateAction ? <div style={{ display: "flex", justifyContent: "center" }}>{emptyStateAction}</div> : null}
          </div>
        )}
      </div>
    </section>
  );
}
