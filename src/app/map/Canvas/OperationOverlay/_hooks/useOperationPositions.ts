import { useMemo } from 'react';
import type { OperationType } from '~/app/map/Canvas/OperationOverlay/types';

interface OperationPosition {
  coordId: string;
  operation: OperationType;
  position: { x: number; y: number };
}

/**
 * Maps pending operations to canvas positions
 * Filters out operations where position cannot be determined
 */
export function useOperationPositions(
  pendingOperations: Record<string, OperationType>,
  getTilePosition: (coordId: string) => { x: number; y: number } | null
): OperationPosition[] {
  return useMemo(() => {
    const positions: OperationPosition[] = [];

    for (const [coordId, operation] of Object.entries(pendingOperations)) {
      const position = getTilePosition(coordId);

      if (position) {
        positions.push({
          coordId,
          operation,
          position,
        });
      }
    }

    return positions;
  }, [pendingOperations, getTilePosition]);
}
