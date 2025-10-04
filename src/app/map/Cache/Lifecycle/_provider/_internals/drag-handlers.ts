import type { TileData } from "~/app/map/types";
import { validateDragOperation } from "~/app/map/Services";

/**
 * Create drop handler for drag service
 */
export function createDropHandler(moveItem: (sourceId: string, targetId: string) => Promise<unknown>) {
  return async (operation: { sourceId: string; targetId: string }) => {
    await moveItem(operation.sourceId, operation.targetId);
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
