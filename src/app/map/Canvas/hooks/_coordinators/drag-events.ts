import type { DragEvent } from "react";
import type { DragState } from "~/app/map/Canvas/hooks/types";
import type { TileData } from "~/app/map/Canvas/types";

export function setupDragStart(
  event: DragEvent<HTMLDivElement>,
  coordId: string
): void {
  // Set the drag effect
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", coordId);
  
  // The browser should automatically create a semi-transparent drag image
  // We don't set a custom drag image to preserve the default behavior
}

export function setupDragOver(
  event: DragEvent<HTMLDivElement>,
  isValid: boolean
): void {
  if (!isValid) return;
  
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
}

export function handleDropEvent(
  event: DragEvent<HTMLDivElement>
): void {
  event.preventDefault();
}

export function createDragState(
  coordId: string,
  tile: TileData,
  event: DragEvent<HTMLDivElement>
): DragState {
  return {
    isDragging: true,
    draggedTileId: coordId,
    draggedTileData: tile,
    dropTargetId: null,
    dropOperation: null,
    dragOffset: { 
      x: event.nativeEvent.offsetX, 
      y: event.nativeEvent.offsetY 
    },
  };
}

export function updateDropTarget(
  state: DragState,
  targetId: string | null
): DragState {
  return {
    ...state,
    dropTargetId: targetId,
  };
}