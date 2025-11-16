'use client';

import { memo, useState, useEffect } from 'react';
import { OperationMarker } from '~/app/map/Canvas/OperationOverlay/_components/OperationMarker';
import { useOperationPositions } from '~/app/map/Canvas/OperationOverlay/_hooks/useOperationPositions';
import { calculateTileDimensions, type TileScale } from '~/app/map/Canvas/Tile';
import { CoordSystem } from '~/lib/domains/mapping/utils';
import type { OperationOverlayProps } from '~/app/map/Canvas/OperationOverlay/types';

/**
 * Calculate the scale for a tile based on its depth and the canvas scale
 * Center tile gets full scale, each level down reduces scale by 1 (minimum 1)
 */
function getTileScale(coordId: string, canvasScale: TileScale): TileScale {
  try {
    const coord = CoordSystem.parseId(coordId);
    const depth = coord.path.length;
    const tileScale = Math.max(1, canvasScale - depth);
    return tileScale as TileScale;
  } catch {
    return 1;
  }
}

/**
 * Overlay canvas that displays hexagonal pulse animations
 * for pending operations at their canvas positions
 *
 * @example
 * ```tsx
 * <OperationOverlay
 *   pendingOperations={cache.pendingOperations}
 *   getTilePosition={layout.getPosition}
 *   scale={3}
 * />
 * ```
 */
export const OperationOverlay = memo(function OperationOverlay({
  pendingOperations,
  getTilePosition,
  baseHexSize = 50,
  scale,
  canvasRef,
}: OperationOverlayProps) {
  const operations = useOperationPositions(pendingOperations, getTilePosition);
  const [canvasCenter, setCanvasCenter] = useState({ x: 0, y: 0 });

  // Get actual canvas center position dynamically
  useEffect(() => {
    if (canvasRef?.current && operations.length > 0) {
      const rect = canvasRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      setCanvasCenter({ x: centerX, y: centerY });
    }
  }, [canvasRef, operations.length]);

  if (operations.length === 0) {
    return null;
  }

  return (
    <div
      className="operation-overlay-wrapper fixed inset-0 pointer-events-none"
      style={{ zIndex: 999999 }}
    >
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{
          width: '100vw',
          height: '100vh',
        }}
        aria-live="polite"
        aria-atomic="false"
      >
        <g transform={`translate(${canvasCenter.x}, ${canvasCenter.y})`}>
          {operations.map(({ coordId, operation, position }) => {
            // Calculate dimensions for this specific tile based on its depth
            const tileScale = getTileScale(coordId, scale);
            const { width, height } = calculateTileDimensions(tileScale, baseHexSize);

            return (
              <OperationMarker
                key={coordId}
                coordId={coordId}
                operation={operation}
                position={position}
                width={width}
                height={height}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
});
