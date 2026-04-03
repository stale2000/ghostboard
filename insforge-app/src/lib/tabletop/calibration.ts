import { type MediaSource, type TableCalibration, type Vec2 } from "../ghostboard-shared";

import { createCalibrationFromQuad } from "./cornerDetection";
import { mediaToScreen, screenToMedia, type Rect, type Size } from "./geometry";

function getQuadBounds(calibration: TableCalibration) {
  const { topLeft, topRight, bottomRight, bottomLeft } = calibration.tableQuadMediaPx;
  const xs = [topLeft.x, topRight.x, bottomRight.x, bottomLeft.x];
  const ys = [topLeft.y, topRight.y, bottomRight.y, bottomLeft.y];

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys)
  };
}

export function isCalibrationValid(calibration: TableCalibration | null): calibration is TableCalibration {
  if (!calibration) {
    return false;
  }

  const bounds = getQuadBounds(calibration);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;

  return width > 0 && height > 0;
}

export function createDefaultCalibration(mediaSource: MediaSource): TableCalibration {
  const insetX = mediaSource.width * 0.08;
  const insetY = mediaSource.height * 0.1;

  return createCalibrationFromQuad(mediaSource, {
    topLeft: { x: insetX, y: insetY },
    topRight: { x: mediaSource.width - insetX, y: insetY },
    bottomRight: { x: mediaSource.width - insetX, y: mediaSource.height - insetY },
    bottomLeft: { x: insetX, y: mediaSource.height - insetY }
  });
}

export function mediaToBoard(mediaPoint: Vec2, calibration: TableCalibration): Vec2 {
  const bounds = getQuadBounds(calibration);

  // TODO: Replace this bounding-box approximation with real homography mapping.
  return {
    x: (mediaPoint.x - bounds.minX) / (bounds.maxX - bounds.minX || 1),
    y: (mediaPoint.y - bounds.minY) / (bounds.maxY - bounds.minY || 1)
  };
}

export function boardToMedia(boardPoint: Vec2, calibration: TableCalibration): Vec2 {
  const bounds = getQuadBounds(calibration);

  // TODO: Replace this bounding-box approximation with real homography mapping.
  return {
    x: bounds.minX + boardPoint.x * (bounds.maxX - bounds.minX),
    y: bounds.minY + boardPoint.y * (bounds.maxY - bounds.minY)
  };
}

export function boardToScreen(
  boardPoint: Vec2,
  calibration: TableCalibration,
  renderedMediaRect: Rect,
  intrinsicMediaSize: Size
): Vec2 {
  return mediaToScreen(boardToMedia(boardPoint, calibration), renderedMediaRect, intrinsicMediaSize);
}

export function screenToBoard(
  screenPoint: Vec2,
  calibration: TableCalibration,
  renderedMediaRect: Rect,
  intrinsicMediaSize: Size
): Vec2 {
  return mediaToBoard(screenToMedia(screenPoint, renderedMediaRect, intrinsicMediaSize), calibration);
}
