import type { Vec2 } from "../ghostboard-shared";

export type Size = {
  width: number;
  height: number;
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function screenToMedia(pointPx: Vec2, renderedMediaRect: Rect, intrinsicMediaSize: Size): Vec2 {
  const relativeX = (pointPx.x - renderedMediaRect.x) / renderedMediaRect.width;
  const relativeY = (pointPx.y - renderedMediaRect.y) / renderedMediaRect.height;

  return {
    x: relativeX * intrinsicMediaSize.width,
    y: relativeY * intrinsicMediaSize.height
  };
}

export function mediaToScreen(mediaPoint: Vec2, renderedMediaRect: Rect, intrinsicMediaSize: Size): Vec2 {
  return {
    x: renderedMediaRect.x + (mediaPoint.x / intrinsicMediaSize.width) * renderedMediaRect.width,
    y: renderedMediaRect.y + (mediaPoint.y / intrinsicMediaSize.height) * renderedMediaRect.height
  };
}

export function clampToRect(point: Vec2, rect: Rect): Vec2 {
  return {
    x: Math.min(Math.max(point.x, rect.x), rect.x + rect.width),
    y: Math.min(Math.max(point.y, rect.y), rect.y + rect.height)
  };
}

export function isFinitePoint(point: Vec2): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}
