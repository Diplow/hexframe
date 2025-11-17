import type { TileData } from "~/app/map/types";
import { validateDragOperation } from '~/app/map/Services/DragAndDrop';;
import { CoordSystem } from "~/lib/domains/mapping/utils";

/**
 * Create drop handler for drag service that routes to copy or move based on operation type
 */
export function createDropHandler(
  moveItem: (sourceId: string, targetId: string) => Promise<unknown>,
  copyItem: (sourceId: string, targetId: string, destinationParentId: string) => Promise<unknown>,
  itemsById: Record<string, TileData>
) {
  return async (operation: { sourceId: string; targetId: string; operation: 'copy' | 'move' }) => {
    if (operation.operation === 'copy') {
      // Validate: cannot copy to non-empty tile
      const targetTile = itemsById[operation.targetId];

      if (targetTile?.metadata.dbId && targetTile.metadata.dbId !== 'empty' && targetTile.metadata.dbId !== '0') {
        throw new Error('Cannot copy to occupied tile. Please select an empty destination.');
      }

      // For copy, we need to determine the destination parent ID
      // The targetId might be an empty hex, so we get the parent coordinate
      const parentCoordId = CoordSystem.getParentCoordFromId(operation.targetId);
      if (!parentCoordId) {
        throw new Error(`Cannot determine parent for destination: ${operation.targetId}`);
      }

      const parentTile = itemsById[parentCoordId];
      if (!parentTile) {
        throw new Error(`Parent tile not found: ${parentCoordId}`);
      }

      const destinationParentId = String(parentTile.metadata.dbId);
      await copyItem(operation.sourceId, operation.targetId, destinationParentId);
    } else {
      // Default to move operation
      await moveItem(operation.sourceId, operation.targetId);
    }
  };
}

/**
 * Create validation handler for drag service
 */
export function createValidationHandler(itemsById: Record<string, TileData>, userId: number) {
  return (sourceId: string, targetId: string) => {
    const sourceTile = itemsById[sourceId] ?? null;
    const targetTile = itemsById[targetId] ?? null;

    return validateDragOperation(
      sourceId,
      targetId,
      sourceTile,
      targetTile,
      userId
    );
  };
}
