import { describe, expect, it } from "vitest";

import type { MediaSource, TableCalibration } from "../ghostboard-shared";

import {
  createCalibrationFromQuad,
  detectTableQuadFromImageData,
  updateCalibrationCorner
} from "./cornerDetection";

type ImageDataLike = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
};

function createSyntheticTableImage(width: number, height: number, bounds: { left: number; top: number; right: number; bottom: number }): ImageDataLike {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const inside = x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
      const value = inside ? 210 : 30;

      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }

  return { data, width, height };
}

describe("detectTableQuadFromImageData", () => {
  it("finds the dominant rectangular tabletop bounds from contrasting image data", () => {
    const mediaSource: MediaSource = {
      kind: "image",
      assetUrl: "synthetic://table",
      width: 120,
      height: 90,
      mimeType: "image/png"
    };
    const image = createSyntheticTableImage(120, 90, {
      left: 18,
      top: 14,
      right: 98,
      bottom: 74
    });

    const calibration = detectTableQuadFromImageData(image, mediaSource, "2026-01-01T00:00:00.000Z");

    expect(calibration.tableQuadMediaPx.topLeft.x).toBeGreaterThanOrEqual(14);
    expect(calibration.tableQuadMediaPx.topLeft.x).toBeLessThanOrEqual(22);
    expect(calibration.tableQuadMediaPx.topLeft.y).toBeGreaterThanOrEqual(10);
    expect(calibration.tableQuadMediaPx.topLeft.y).toBeLessThanOrEqual(18);
    expect(calibration.tableQuadMediaPx.bottomRight.x).toBeGreaterThanOrEqual(94);
    expect(calibration.tableQuadMediaPx.bottomRight.x).toBeLessThanOrEqual(102);
    expect(calibration.tableQuadMediaPx.bottomRight.y).toBeGreaterThanOrEqual(70);
    expect(calibration.tableQuadMediaPx.bottomRight.y).toBeLessThanOrEqual(78);
  });
});

describe("updateCalibrationCorner", () => {
  it("updates one corner, clamps it to the media bounds, and refreshes updatedAt", () => {
    const baseCalibration: TableCalibration = createCalibrationFromQuad(
      {
        kind: "image",
        assetUrl: "synthetic://table",
        width: 100,
        height: 80,
        mimeType: "image/png"
      },
      {
        topLeft: { x: 8, y: 8 },
        topRight: { x: 92, y: 8 },
        bottomRight: { x: 92, y: 72 },
        bottomLeft: { x: 8, y: 72 }
      },
      "2026-01-01T00:00:00.000Z"
    );

    const updated = updateCalibrationCorner(baseCalibration, "topLeft", { x: -10, y: 200 }, "2026-01-01T00:00:05.000Z");

    expect(updated.tableQuadMediaPx.topLeft).toEqual({ x: 0, y: 79 });
    expect(updated.tableQuadMediaPx.topRight).toEqual(baseCalibration.tableQuadMediaPx.topRight);
    expect(updated.updatedAt).toBe("2026-01-01T00:00:05.000Z");
  });
});
