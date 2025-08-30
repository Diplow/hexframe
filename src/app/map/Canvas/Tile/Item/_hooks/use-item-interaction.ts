"use client";

import { useContext } from "react";
import { LegacyTileActionsContext } from "~/app/map/Canvas";

export interface ItemInteractionState {
  isDraggable: boolean;
  isBeingDragged: boolean;
  isValidDropTarget: boolean;
  isDropTargetActive: boolean;
  dropOperation: 'move' | 'swap' | null;
}

/**
 * Hook to access the interaction state for a specific tile item
 * Combines drag, drop, and edit state from the TileActionsContext
 * 
 * @param coordId - The coordinate ID of the tile
 * @returns Combined interaction state including drag, drop, and edit status
 */
export function useItemInteraction(coordId: string): ItemInteractionState {
  const context = useContext(LegacyTileActionsContext);
  
  // Return default state if no context (not within Canvas)
  if (!context) {
    return {
      isDraggable: false,
      isBeingDragged: false,
      isValidDropTarget: false,
      isDropTargetActive: false,
      dropOperation: null,
    };
  }

  return {
    isDraggable: context.canDragTile(coordId),
    isBeingDragged: context.isDraggingTile(coordId),
    isValidDropTarget: context.isValidDropTarget(coordId),
    isDropTargetActive: context.isDropTarget(coordId),
    dropOperation: context.getDropOperation(coordId),
  };
}