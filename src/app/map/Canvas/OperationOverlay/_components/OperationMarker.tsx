'use client';

import { memo } from 'react';
import { HexagonPulse } from '~/app/map/Canvas/OperationOverlay/_components/HexagonPulse';
import type { OperationMarkerProps } from '~/app/map/Canvas/OperationOverlay/types';

/**
 * Positions a HexagonPulse at a specific canvas coordinate
 * Centers the hexagon on the position by offsetting by half width/height
 */
export const OperationMarker = memo(function OperationMarker({
  coordId,
  operation,
  position,
  width,
  height,
}: OperationMarkerProps) {
  return (
    <g
      transform={`translate(${position.x}, ${position.y})`}
      data-coord-id={coordId}
      data-operation={operation}
    >
      <foreignObject width={width} height={height} x={-width / 2} y={-height / 2}>
        <HexagonPulse operation={operation} width={width} height={height} />
      </foreignObject>
    </g>
  );
});
