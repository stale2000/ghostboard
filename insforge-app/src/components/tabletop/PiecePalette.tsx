import type { PieceAsset, SessionRole } from "../../lib/ghostboard-shared";

type PiecePaletteProps = {
  role: SessionRole;
  assets: PieceAsset[];
};

export function PiecePalette({ role, assets }: PiecePaletteProps) {
  const canCreate = role === "host" || role === "editor";

  return (
    <section
      style={{
        background: "linear-gradient(180deg, rgba(6, 78, 59, 0.32) 0%, rgba(15, 23, 42, 0.92) 100%)",
        border: "1px solid rgba(74, 222, 128, 0.24)",
        borderRadius: 24,
        padding: 16
      }}
    >
      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
        <div>
          <h3 style={{ color: "#dcfce7", margin: 0 }}>Piece Palette</h3>
          <p style={{ color: "#86efac", fontSize: 14 }}>Built-in assets only in MVP.</p>
        </div>
        <span
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            borderRadius: 999,
            color: "#bbf7d0",
            fontSize: 12,
            fontWeight: 600,
            padding: "6px 10px"
          }}
        >
          {canCreate ? "Can create pieces" : "Spectator"}
        </span>
      </div>

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {assets.map((asset) => (
          <article
            key={asset.id}
            style={{
              background: "rgba(15, 23, 42, 0.72)",
              border: "1px solid rgba(134, 239, 172, 0.18)",
              borderRadius: 18,
              padding: 12
            }}
          >
            <div style={{ alignItems: "flex-start", display: "flex", gap: 12, justifyContent: "space-between" }}>
              <div>
                <h4 style={{ color: "#f8fafc", margin: 0 }}>{asset.name}</h4>
                <p style={{ color: "#cbd5e1", fontSize: 14, marginBottom: 0 }}>{asset.tags.join(", ")}</p>
              </div>
              <div style={{ color: "#94a3b8", fontSize: 12, textAlign: "right" }}>
                {asset.width}x{asset.height}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
