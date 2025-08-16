import type { DragEvent } from "react";
import type { LegacyTileActionsContextValue } from "../../..";

export interface DropProps {
  onDragOver?: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave?: () => void;
  onDrop?: (e: DragEvent<HTMLDivElement>) => void;
}

/**
 * Creates drop props for a tile item based on its interaction state
 * Coordinates with the TileActions context to manage drop target state
 * 
 * @param coordId - The coordinate ID of the potential drop target
 * @param actions - The tile actions from context
 * @param isValidDropTarget - Whether this tile is a valid drop target
 * @returns Complete drop props to spread on the tile element
 */
export function createDropProps(
  coordId: string,
  actions: LegacyTileActionsContextValue | null,
  isValidDropTarget: boolean
): DropProps {
  // No drop props if not a valid target or no actions context
  if (!isValidDropTarget || !actions) {
    return {};
  }

  return {
    onDragOver: (e: DragEvent<HTMLDivElement>) => 
      actions.dragHandlers.onDragOver(coordId, e),
    onDragLeave: actions.dragHandlers.onDragLeave,
    onDrop: (e: DragEvent<HTMLDivElement>) => 
      actions.dragHandlers.onDrop(coordId, e),
  };
}