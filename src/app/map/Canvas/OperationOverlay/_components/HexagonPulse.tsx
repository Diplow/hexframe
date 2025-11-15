'use client';

import { memo } from 'react';
import { generateHexagonPath, getHexagonViewBox } from '~/app/map/Canvas/OperationOverlay/_utils/hexagon-path';
import { getOperationColors } from '~/app/map/Canvas/OperationOverlay/_utils/operation-colors';
import type { HexagonPulseProps } from '~/app/map/Canvas/OperationOverlay/types';

/**
 * Renders a pulsing hexagon for a specific operation type
 * Uses SVG with CSS animations for GPU acceleration
 * Matches the exact path and dimensions from BaseTileLayout
 */
export const HexagonPulse = memo(function HexagonPulse({
  operation,
  width,
  height,
  className = '',
}: HexagonPulseProps) {
  const path = generateHexagonPath();
  const viewBox = getHexagonViewBox();
  const colors = getOperationColors(operation);

  return (
    <svg
      viewBox={viewBox}
      className={`hex-pulse ${className}`}
      style={{ width, height }}
      aria-label={`${operation} operation in progress`}
      role="status"
    >
      {/* Fill layer with pulse animation - no border/stroke effects */}
      <path d={path} fill={colors.fill} className="hex-pulse-fill" />
    </svg>
  );
});
