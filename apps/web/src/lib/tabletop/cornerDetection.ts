import {
  NORMALIZED_BOARD_SIZE,
  type MediaSource,
  type Quad,
  type TableCalibration,
  type Vec2
} from "../ghostboard-shared";

export type ImageDataLike = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
};

export type QuadCornerKey = keyof Quad;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function toLuminance(data: Uint8ClampedArray, offset: number): number {
  return (data[offset] ?? 0) * 0.299 + (data[offset + 1] ?? 0) * 0.587 + (data[offset + 2] ?? 0) * 0.114;
}

function createFallbackQuad(mediaSource: MediaSource): Quad {
  const insetX = mediaSource.width * 0.08;
  const insetY = mediaSource.height * 0.1;

  return {
    topLeft: { x: insetX, y: insetY },
    topRight: { x: mediaSource.width - insetX, y: insetY },
    bottomRight: { x: mediaSource.width - insetX, y: mediaSource.height - insetY },
    bottomLeft: { x: insetX, y: mediaSource.height - insetY }
  };
}

function measureBorderBackground(imageData: ImageDataLike): number {
  const borderThickness = Math.max(1, Math.round(Math.min(imageData.width, imageData.height) * 0.04));
  let total = 0;
  let count = 0;

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const isBorder =
        x < borderThickness ||
        y < borderThickness ||
        x >= imageData.width - borderThickness ||
        y >= imageData.height - borderThickness;

      if (!isBorder) {
        continue;
      }

      total += toLuminance(imageData.data, (y * imageData.width + x) * 4);
      count += 1;
    }
  }

  return count > 0 ? total / count : 0;
}

function findActiveBounds(imageData: ImageDataLike, backgroundLuma: number) {
  const rowCounts = new Array<number>(imageData.height).fill(0);
  const colCounts = new Array<number>(imageData.width).fill(0);
  const threshold = 24;

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const luma = toLuminance(imageData.data, (y * imageData.width + x) * 4);
      if (Math.abs(luma - backgroundLuma) < threshold) {
        continue;
      }

      rowCounts[y] = (rowCounts[y] ?? 0) + 1;
      colCounts[x] = (colCounts[x] ?? 0) + 1;
    }
  }

  const minRowActivity = Math.max(4, Math.round(imageData.width * 0.18));
  const minColActivity = Math.max(4, Math.round(imageData.height * 0.18));

  const top = rowCounts.findIndex((value) => value >= minRowActivity);
  const bottom = rowCounts.length - 1 - [...rowCounts].reverse().findIndex((value) => value >= minRowActivity);
  const left = colCounts.findIndex((value) => value >= minColActivity);
  const right = colCounts.length - 1 - [...colCounts].reverse().findIndex((value) => value >= minColActivity);

  return {
    top: top >= 0 ? top : null,
    right: right >= 0 ? right : null,
    bottom: bottom >= 0 ? bottom : null,
    left: left >= 0 ? left : null
  };
}

function isUsableBounds(bounds: { top: number | null; right: number | null; bottom: number | null; left: number | null }, mediaSource: MediaSource): bounds is {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  if (bounds.top === null || bounds.right === null || bounds.bottom === null || bounds.left === null) {
    return false;
  }

  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;

  return width >= mediaSource.width * 0.2 && height >= mediaSource.height * 0.2;
}

export function createCalibrationFromQuad(mediaSource: MediaSource, tableQuadMediaPx: Quad, now = new Date().toISOString()): TableCalibration {
  return {
    mediaWidth: mediaSource.width,
    mediaHeight: mediaSource.height,
    normalizedWidth: NORMALIZED_BOARD_SIZE.width,
    normalizedHeight: NORMALIZED_BOARD_SIZE.height,
    transformVersion: "homography-v1",
    createdAt: now,
    updatedAt: now,
    tableQuadMediaPx
  };
}

export function detectTableQuadFromImageData(
  imageData: ImageDataLike,
  mediaSource: MediaSource,
  now = new Date().toISOString()
): TableCalibration {
  const backgroundLuma = measureBorderBackground(imageData);
  const bounds = findActiveBounds(imageData, backgroundLuma);

  if (!isUsableBounds(bounds, mediaSource)) {
    return createCalibrationFromQuad(mediaSource, createFallbackQuad(mediaSource), now);
  }

  return createCalibrationFromQuad(
    mediaSource,
    {
      topLeft: { x: bounds.left, y: bounds.top },
      topRight: { x: bounds.right, y: bounds.top },
      bottomRight: { x: bounds.right, y: bounds.bottom },
      bottomLeft: { x: bounds.left, y: bounds.bottom }
    },
    now
  );
}

export function updateCalibrationCorner(
  calibration: TableCalibration,
  corner: QuadCornerKey,
  point: Vec2,
  now = new Date().toISOString()
): TableCalibration {
  return {
    ...calibration,
    updatedAt: now,
    tableQuadMediaPx: {
      ...calibration.tableQuadMediaPx,
      [corner]: {
        x: clamp(point.x, 0, calibration.mediaWidth - 1),
        y: clamp(point.y, 0, calibration.mediaHeight - 1)
      }
    }
  };
}
