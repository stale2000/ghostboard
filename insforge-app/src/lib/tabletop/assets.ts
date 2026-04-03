import type { PieceAsset } from "../ghostboard-shared";

export const DEFAULT_ASSETS: PieceAsset[] = [
  {
    id: "pawn-red",
    name: "Red Pawn",
    imageUrl: "/pieces/pawn-red.png",
    width: 128,
    height: 128,
    tags: ["pawn", "starter"]
  },
  {
    id: "pawn-blue",
    name: "Blue Pawn",
    imageUrl: "/pieces/pawn-blue.png",
    width: 128,
    height: 128,
    tags: ["pawn", "starter"]
  },
  {
    id: "cube-green",
    name: "Green Cube",
    imageUrl: "/pieces/cube-green.png",
    width: 128,
    height: 128,
    tags: ["cube", "resource"]
  },
  {
    id: "token-gold",
    name: "Gold Token",
    imageUrl: "/pieces/token-gold.png",
    width: 128,
    height: 128,
    tags: ["token", "currency"]
  },
  {
    id: "card-back",
    name: "Card Back",
    imageUrl: "/pieces/card-back.png",
    width: 256,
    height: 384,
    tags: ["card"]
  }
];

export type AssetLibrary = {
  assets: PieceAsset[];
  byId: Record<string, PieceAsset>;
  tags: Record<string, PieceAsset[]>;
};

export function indexAssetsById(assets: PieceAsset[]): Record<string, PieceAsset> {
  return Object.fromEntries(assets.map((asset) => [asset.id, asset]));
}

export function indexAssetsByTag(assets: PieceAsset[]): Record<string, PieceAsset[]> {
  return assets.reduce<Record<string, PieceAsset[]>>((acc, asset) => {
    for (const tag of asset.tags) {
      acc[tag] ??= [];
      acc[tag].push(asset);
    }

    return acc;
  }, {});
}

export function createAssetLibrary(assets: PieceAsset[] = DEFAULT_ASSETS): AssetLibrary {
  return {
    assets,
    byId: indexAssetsById(assets),
    tags: indexAssetsByTag(assets)
  };
}
