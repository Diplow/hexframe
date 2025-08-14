import type { Coord } from "~/lib/domains/mapping/utils/hex-coordinates";
import { Direction } from "~/lib/domains/mapping/utils/hex-coordinates";
import type { SwapPreviewState } from "./types";
import { DEFAULT_MAP_COLORS } from "~/app/map/constants";

/**
 * Type guard to check if a value is a valid Direction
 */
function isValidDirection(value: unknown): value is Direction {
  return typeof value === 'number' && value in Direction && value in DEFAULT_MAP_COLORS;
}

/**
 * Calculates the color a tile would have at a given coordinate
 */
function calculateColorForCoordinate(coord: Coord): string {
  // Handle root tiles (empty path)
  if (!coord.path || coord.path.length === 0) {
    return "zinc-50";
  }
  
  // Validate first path element exists and is a valid direction
  const firstDirection = coord.path[0];
  if (!isValidDirection(firstDirection)) {
    console.warn(`Invalid direction in coordinate path: ${firstDirection}`);
    return "zinc-50"; // Default fallback color
  }
  
  // Get the base color for the direction
  const colorBase = DEFAULT_MAP_COLORS[firstDirection];
  
  // Calculate color intensity based on depth
  // Tailwind color classes go from 50 to 900 in increments of 50/100
  // We start at 100 and add 100 per depth level, capping at 900
  const depth = Math.min(coord.path.length, 8); // Max depth of 8 to stay within 900
  const colorIntensity = Math.min(100 + 100 * depth, 900);
  
  return `${colorBase}-${colorIntensity}`;
}

/**
 * Creates a preview state for swap operation showing what colors
 * the tiles would have after swapping positions
 */
export function createSwapColorPreview(
  sourceCoord: Coord,
  targetCoord: Coord
): SwapPreviewState {
  return {
    type: "swap",
    sourceCoord,
    targetCoord,
    data: {
      // Source tile would get target's color
      sourcePreviewColor: calculateColorForCoordinate(targetCoord),
      // Target tile would get source's color  
      targetPreviewColor: calculateColorForCoordinate(sourceCoord),
    },
  };
}

/**
 * Robust path equality: handles undefined paths and avoids join-collisions
 */
function samePath(a?: number[], b?: number[]): boolean {
  const ap = a ?? [];
  const bp = b ?? [];
  if (ap.length !== bp.length) return false;
  for (let i = 0; i < ap.length; i++) {
    if (ap[i] !== bp[i]) return false;
  }
  return true;
}

/**
 * Gets the preview color for a tile during a swap operation
 */
export function getSwapPreviewColor(
  tileCoord: Coord,
  swapPreview: SwapPreviewState
): string | null {
  const isSource = 
    tileCoord.userId === swapPreview.sourceCoord.userId &&
    tileCoord.groupId === swapPreview.sourceCoord.groupId &&
    samePath(tileCoord.path, swapPreview.sourceCoord.path);
    
  const isTarget = 
    tileCoord.userId === swapPreview.targetCoord.userId &&
    tileCoord.groupId === swapPreview.targetCoord.groupId &&
    samePath(tileCoord.path, swapPreview.targetCoord.path);
  
  if (isSource) {
    return swapPreview.data.sourcePreviewColor;
  }
  
  if (isTarget) {
    return swapPreview.data.targetPreviewColor;
  }
  
  return null;
}