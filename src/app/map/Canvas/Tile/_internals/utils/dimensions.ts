/**
 * Calculate tile dimensions based on scale and base hex size
 *
 * This is the core calculation used throughout the tile system to ensure
 * consistent sizing across all tile types (item tiles, base tiles, frames).
 */

import type { TileScale } from "~/app/map/Canvas/Tile/Base/BaseTileLayout";

export interface TileDimensions {
  width: number;
  height: number;
}

/**
 * Calculate tile dimensions for a given scale
 *
 * @param scale - The tile scale (1, 2, or 3)
 * @param baseHexSize - Base hexagon size in pixels (default: 50)
 * @returns Object with width and height in pixels
 */
export function calculateTileDimensions(
  scale: TileScale,
  baseHexSize: number = 50
): TileDimensions {
  const width =
    scale === 1
      ? baseHexSize * Math.sqrt(3)
      : baseHexSize * Math.sqrt(3) * Math.pow(3, scale - 1);

  const height =
    scale === 1
      ? baseHexSize * 2
      : baseHexSize * 2 * Math.pow(3, scale - 1);

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}
