import type { DragEvent } from "react";
import type { TileData } from "~/app/map/types/tile-data";

export type DropOperation = 'move' | 'swap';

export interface DragState {
  isDragging: boolean;
  draggedTileId: string | null;
  draggedTileData: TileData | null;
  dropTargetId: string | null;
  dropOperation: DropOperation | null;
  dragOffset: { x: number; y: number };
}


export interface DragHandlers {
  onDragStart: (coordId: string, event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (targetCoordId: string, event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (targetCoordId: string, event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}

