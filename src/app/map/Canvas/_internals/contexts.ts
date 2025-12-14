"use client";

/**
 * Shared Canvas contexts and utilities
 * 
 * Extracted to avoid circular imports when Canvas index needs to reexport
 * these items for internal Canvas components.
 */

import { createContext, useContext, type DragEvent } from 'react';

// Theme Context for tiles
export interface ThemeContextValue {
  isDarkMode: boolean;
}

export const CanvasThemeContext = createContext<ThemeContextValue>({
  isDarkMode: false,
});

export function useCanvasTheme() {
  return useContext(CanvasThemeContext);
}

// Legacy Tile Actions Context
export interface LegacyTileActionsContextValue {
  handleTileClick: (coordId: string, event: MouseEvent) => void;
  handleTileHover: (coordId: string, isHovering: boolean) => void;
  onCreateTileRequested?: (coordId: string) => void;
  // Drag and drop handlers
  dragHandlers: {
    onDragStart: (coordId: string, event: DragEvent<HTMLDivElement>) => void;
    onDragOver: (coordId: string, event: DragEvent<HTMLDivElement>) => void;
    onDragLeave: () => void;
    onDrop: (coordId: string, event: DragEvent<HTMLDivElement>) => void;
    onDragEnd: () => void;
  };
  canDragTile: (coordId: string) => boolean;
  isDraggingTile: (coordId: string) => boolean;
  isDropTarget: (coordId: string) => boolean;
  isValidDropTarget: (coordId: string) => boolean;
  isDragging: boolean;
  getDropOperation: (coordId: string) => 'move' | 'swap' | null;
}

export const LegacyTileActionsContext = createContext<LegacyTileActionsContextValue | null>(
  null
);

export function useLegacyTileActionsContext() {
  const context = useContext(LegacyTileActionsContext);
  if (!context) {
    throw new Error("useLegacyTileActionsContext must be used within a LegacyTileActionsProvider");
  }
  return context;
}