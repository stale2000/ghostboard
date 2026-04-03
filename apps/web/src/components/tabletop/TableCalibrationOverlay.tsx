"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { Quad, TableCalibration } from "../../lib/ghostboard-shared";

import { updateCalibrationCorner } from "../../lib/tabletop/cornerDetection";
import { mediaToScreen, screenToMedia, type Rect, type Size } from "../../lib/tabletop/geometry";

type TableCalibrationOverlayProps = {
  calibration: TableCalibration | null;
  intrinsicSize: Size;
  renderedRect: Rect;
  editable: boolean;
  onChangeCalibration?: (nextCalibration: TableCalibration) => void;
};

type CornerKey = keyof Quad;

const cornerOrder: CornerKey[] = ["topLeft", "topRight", "bottomRight", "bottomLeft"];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function TableCalibrationOverlay({
  calibration,
  intrinsicSize,
  renderedRect,
  editable,
  onChangeCalibration
}: TableCalibrationOverlayProps) {
  const overlayRef = useRef<SVGSVGElement | null>(null);
  const [draggingCorner, setDraggingCorner] = useState<CornerKey | null>(null);

  useEffect(() => {
    if (!draggingCorner) {
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      if (!overlayRef.current || !calibration || !draggingCorner) {
        return;
      }

      const bounds = overlayRef.current.getBoundingClientRect();
      const nextMediaPoint = screenToMedia(
        {
          x: clamp(event.clientX - bounds.left, 0, renderedRect.width),
          y: clamp(event.clientY - bounds.top, 0, renderedRect.height)
        },
        { x: 0, y: 0, width: renderedRect.width, height: renderedRect.height },
        intrinsicSize
      );

      onChangeCalibration?.(updateCalibrationCorner(calibration, draggingCorner, nextMediaPoint));
    }

    function stopDragging() {
      setDraggingCorner(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
    };
  }, [calibration, draggingCorner, intrinsicSize, onChangeCalibration, renderedRect.height, renderedRect.width]);

  const screenQuad = useMemo(() => {
    if (!calibration) {
      return null;
    }

    return cornerOrder.reduce<Record<CornerKey, { x: number; y: number }>>((accumulator, cornerKey) => {
      accumulator[cornerKey] = mediaToScreen(
        calibration.tableQuadMediaPx[cornerKey],
        { x: 0, y: 0, width: renderedRect.width, height: renderedRect.height },
        intrinsicSize
      );
      return accumulator;
    }, {} as Record<CornerKey, { x: number; y: number }>);
  }, [calibration, intrinsicSize, renderedRect]);

  if (!calibration || !screenQuad) {
    return null;
  }

  const polygonPoints = cornerOrder
    .map((cornerKey) => {
      const point = screenQuad[cornerKey];
      return `${point.x},${point.y}`;
    })
    .join(" ");

  const gridLines = [0.25, 0.5, 0.75].flatMap((ratio) => {
    const leftX = screenQuad.topLeft.x + (screenQuad.bottomLeft.x - screenQuad.topLeft.x) * ratio;
    const leftY = screenQuad.topLeft.y + (screenQuad.bottomLeft.y - screenQuad.topLeft.y) * ratio;
    const rightX = screenQuad.topRight.x + (screenQuad.bottomRight.x - screenQuad.topRight.x) * ratio;
    const rightY = screenQuad.topRight.y + (screenQuad.bottomRight.y - screenQuad.topRight.y) * ratio;
    const topX = screenQuad.topLeft.x + (screenQuad.topRight.x - screenQuad.topLeft.x) * ratio;
    const topY = screenQuad.topLeft.y + (screenQuad.topRight.y - screenQuad.topLeft.y) * ratio;
    const bottomX = screenQuad.bottomLeft.x + (screenQuad.bottomRight.x - screenQuad.bottomLeft.x) * ratio;
    const bottomY = screenQuad.bottomLeft.y + (screenQuad.bottomRight.y - screenQuad.bottomLeft.y) * ratio;

    return [
      <line
        key={`row-${ratio}`}
        x1={leftX}
        y1={leftY}
        x2={rightX}
        y2={rightY}
        stroke="rgba(125, 211, 252, 0.85)"
        strokeDasharray="8 10"
        strokeWidth={1.5}
      />,
      <line
        key={`col-${ratio}`}
        x1={topX}
        y1={topY}
        x2={bottomX}
        y2={bottomY}
        stroke="rgba(196, 181, 253, 0.85)"
        strokeDasharray="8 10"
        strokeWidth={1.5}
      />
    ];
  });

  return (
    <svg
      ref={overlayRef}
      viewBox={`0 0 ${renderedRect.width} ${renderedRect.height}`}
      style={{
        height: renderedRect.height,
        inset: 0,
        left: renderedRect.x,
        pointerEvents: editable ? "auto" : "none",
        position: "absolute",
        top: renderedRect.y,
        width: renderedRect.width
      }}
    >
      <polygon fill="rgba(34, 211, 238, 0.16)" points={polygonPoints} stroke="rgba(34, 211, 238, 0.95)" strokeWidth={3} />
      {gridLines}
      {cornerOrder.map((cornerKey) => {
        const point = screenQuad[cornerKey];

        return (
          <g key={cornerKey}>
            <circle cx={point.x} cy={point.y} fill="rgba(15, 23, 42, 0.8)" r={12} stroke="rgba(248, 250, 252, 0.95)" strokeWidth={3} />
            <circle
              cx={point.x}
              cy={point.y}
              fill="rgba(56, 189, 248, 0.95)"
              onPointerDown={(event) => {
                if (!editable) {
                  return;
                }

                event.preventDefault();
                setDraggingCorner(cornerKey);
              }}
              r={6}
              style={{ cursor: editable ? "grab" : "default" }}
            />
          </g>
        );
      })}
      <text fill="rgba(248, 250, 252, 0.95)" fontSize={14} fontWeight={700} x={16} y={24}>
        Auto-detected play surface {editable ? "• drag corners to refine" : ""}
      </text>
    </svg>
  );
}
