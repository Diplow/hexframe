import type { TileScale } from "~/app/static/map/Tile/Base/base";

/**
 * Calculates the negative margin needed for hexagon row overlap
 * @param parentScale - The scale of the parent frame
 * @param baseHexSize - The base size of a single hexagon
 * @returns The margin in pixels
 */
export function calculateHexRowMargin(parentScale: TileScale, baseHexSize: number): number {
  return parentScale === 2 
    ? baseHexSize / 2 
    : (baseHexSize / 2) * Math.pow(3, parentScale - 2);
}

/**
 * Defines the row structure for a 7-tile hexagonal arrangement
 */
export const HEX_LAYOUT_ROWS = [
  ['NW', 'NE'],
  ['W', 'C', 'E'],
  ['SW', 'SE']
] as const;

/**
 * Maps position strings to array indices for child coordinates
 */
export const POSITION_TO_INDEX: Record<string, number> = {
  'NW': 0,
  'NE': 1,
  'E': 2,
  'SE': 3,
  'SW': 4,
  'W': 5,
};