import type { DragEvent } from "react";
import type { LegacyTileActionsContextValue } from "../../..";

export interface DragProps {
  draggable: boolean;
  onDragStart?: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
  style?: React.CSSProperties;
}

/**
 * Creates drag props for a tile item based on its interaction state
 * Coordinates with the TileActions context to manage drag state
 * 
 * @param coordId - The coordinate ID of the tile
 * @param actions - The tile actions from context
 * @param isDraggable - Whether this tile can be dragged
 * @param isBeingDragged - Whether this tile is currently being dragged
 * @returns Complete drag props to spread on the tile element
 */
export function createDragProps(
  coordId: string,
  actions: LegacyTileActionsContextValue | null,
  isDraggable: boolean,
  _isBeingDragged: boolean
): DragProps {
  // No drag props if not draggable or no actions context
  if (!isDraggable || !actions) {
    return { draggable: false };
  }

  return {
    draggable: true,
    onDragStart: (e: DragEvent<HTMLDivElement>) => 
      actions.dragHandlers.onDragStart(coordId, e),
    onDragEnd: actions.dragHandlers.onDragEnd,
    // Don't override cursor style - let useTileInteraction handle it
  };
}