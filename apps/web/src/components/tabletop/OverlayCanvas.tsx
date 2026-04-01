import type { PieceAsset, PieceInstance, SessionRole } from "@ghostboard/shared";

type OverlayCanvasProps = {
  role: SessionRole;
  pieces: PieceInstance[];
  assets: Record<string, PieceAsset>;
  selectedPieceId?: string | null;
  onSelectPiece?: (pieceId: string) => void;
};

export function OverlayCanvas({ role, pieces, assets, selectedPieceId, onSelectPiece }: OverlayCanvasProps) {
  return (
    <section
      style={{
        background: "#f0f9ff",
        border: "1px solid #7dd3fc",
        borderRadius: 24,
        padding: 16
      }}
    >
      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
        <div>
          <h3 style={{ color: "#082f49", margin: 0 }}>Overlay Canvas</h3>
          <p style={{ color: "#0c4a6e", fontSize: 14 }}>
            GhostBoard renders digital pieces here, with transforms stored in normalized board coordinates.
          </p>
        </div>
        <span
          style={{
            background: "#ffffff",
            borderRadius: 999,
            color: "#075985",
            fontSize: 12,
            fontWeight: 600,
            padding: "6px 10px"
          }}
        >
          {role === "spectator" ? "Read only" : "Interactive later"}
        </span>
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
        {pieces.length === 0 ? (
          <div
            style={{
              background: "#ffffff",
              border: "1px dashed #7dd3fc",
              borderRadius: 18,
              color: "#64748b",
              fontSize: 14,
              padding: 16
            }}
          >
            No pieces on the board yet.
          </div>
        ) : (
          pieces
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((piece) => (
              <div
                key={piece.id}
                onClick={() => onSelectPiece?.(piece.id)}
                style={{
                  background: "#ffffff",
                  border: piece.id === selectedPieceId ? "2px solid #0284c7" : "1px solid #bae6fd",
                  borderRadius: 18,
                  color: "#334155",
                  cursor: onSelectPiece ? "pointer" : "default",
                  fontSize: 14,
                  padding: "10px 12px"
                }}
              >
                <span style={{ color: "#0f172a", fontWeight: 600 }}>
                  {assets[piece.assetId]?.name ?? piece.assetId}
                </span>
                {` at normalized (${piece.position.x.toFixed(2)}, ${piece.position.y.toFixed(2)}) rotation ${piece.rotationDeg.toFixed(1)} scale ${piece.scale.toFixed(2)}`}
              </div>
            ))
        )}
      </div>
    </section>
  );
}
