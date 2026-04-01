import type { PieceAsset, PieceInstance } from "@ghostboard/shared";

type PieceInspectorProps = {
  selectedPiece: PieceInstance | null;
  assets: Record<string, PieceAsset>;
};

export function PieceInspector({ selectedPiece, assets }: PieceInspectorProps) {
  const asset = selectedPiece ? assets[selectedPiece.assetId] : null;

  return (
    <section
      style={{
        background: "linear-gradient(180deg, rgba(88, 28, 135, 0.30) 0%, rgba(15, 23, 42, 0.94) 100%)",
        border: "1px solid rgba(196, 181, 253, 0.24)",
        borderRadius: 24,
        padding: 16
      }}
    >
      <h3 style={{ color: "#ede9fe", margin: 0 }}>Piece Inspector</h3>
      {selectedPiece ? (
        <dl style={{ color: "#cbd5e1", display: "grid", fontSize: 14, gap: 8, marginTop: 12 }}>
          <div style={{ display: "flex", gap: 16, justifyContent: "space-between" }}>
            <dt style={{ color: "#f8fafc", fontWeight: 600 }}>Asset</dt>
            <dd>{asset?.name ?? selectedPiece.assetId}</dd>
          </div>
          <div style={{ display: "flex", gap: 16, justifyContent: "space-between" }}>
            <dt style={{ color: "#f8fafc", fontWeight: 600 }}>Position</dt>
            <dd>
              normalized {selectedPiece.position.x.toFixed(2)}, {selectedPiece.position.y.toFixed(2)}
            </dd>
          </div>
          <div style={{ display: "flex", gap: 16, justifyContent: "space-between" }}>
            <dt style={{ color: "#f8fafc", fontWeight: 600 }}>Locked</dt>
            <dd>{selectedPiece.locked ? "Yes" : "No"}</dd>
          </div>
          <div style={{ display: "flex", gap: 16, justifyContent: "space-between" }}>
            <dt style={{ color: "#f8fafc", fontWeight: 600 }}>Rotation</dt>
            <dd>{selectedPiece.rotationDeg.toFixed(1)} deg</dd>
          </div>
          <div style={{ display: "flex", gap: 16, justifyContent: "space-between" }}>
            <dt style={{ color: "#f8fafc", fontWeight: 600 }}>Scale</dt>
            <dd>{selectedPiece.scale.toFixed(2)}</dd>
          </div>
        </dl>
      ) : (
        <p style={{ color: "#ddd6fe", fontSize: 14, marginTop: 12 }}>
          Summon a table image and click a ghost piece in the overlay list to inspect GhostBoard&apos;s local-only selection state.
        </p>
      )}
    </section>
  );
}
