import type { Coord } from "~/lib/domains/mapping/interface";

/**
 * Base preview state interface
 * Extensible type system for different preview operations
 */
export interface PreviewState {
  /** Type of preview operation */
  type: "swap" | "move" | "delete" | "create";
  
  /** Coordinates involved in the preview */
  sourceCoord: Coord;
  targetCoord?: Coord;
  
  /** Preview-specific data */
  data: unknown;
}

/**
 * Swap preview state with color information
 */
export interface SwapPreviewState extends PreviewState {
  type: "swap";
  targetCoord: Coord;
  data: {
    sourcePreviewColor: string;
    targetPreviewColor: string;
  };
}

/**
 * Move preview state
 */
export interface MovePreviewState extends PreviewState {
  type: "move";
  targetCoord: Coord;
  data: {
    previewColor: string;
  };
}

/**
 * Type guard for swap preview
 */
export function isSwapPreview(preview: PreviewState): preview is SwapPreviewState {
  return preview.type === "swap";
}

/**
 * Type guard for move preview
 */
export function isMovePreview(preview: PreviewState): preview is MovePreviewState {
  return preview.type === "move";
}