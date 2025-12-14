/**
 * Hexagonal positioning calculations for neighbor tiles
 */

import { Direction } from "~/lib/domains/mapping/utils";

// Calculate positioning based on actual tile dimensions and hexagonal geometry
// Using the exact formulas from BaseTileLayout.tsx:
// X (tile edge) = baseHexSize * Math.pow(3, scale - 1)
// Y (tile width) = baseHexSize * √3 * Math.pow(3, scale - 1)
export function calculateNeighborPositions(baseHexSize: number, scale: number) {
  const scaledBaseSize = baseHexSize * Math.pow(3, scale - 1); // X in your formula
  const tileWidth = baseHexSize * Math.sqrt(3) * Math.pow(3, scale - 1); // Y in your formula (from BaseTileLayout)

  // Hexagonal positioning: neighbors are positioned to share edges
  // For proper edge-sharing in hexagonal grid:
  // - East/West: full tile width horizontally
  // - NW/NE/SW/SE: 0.5 tile width horizontally, 1.5 scaled base size vertically
  // Composed children (negative directions) use the same positions as structural children
  return {
    [Direction.Center]: { x: 0, y: 0 },
    [Direction.NorthWest]: { x: -0.5 * tileWidth, y: -1.5 * scaledBaseSize },
    [Direction.NorthEast]: { x: 0.5 * tileWidth, y: -1.5 * scaledBaseSize },
    [Direction.East]: { x: tileWidth, y: 0 },
    [Direction.SouthEast]: { x: 0.5 * tileWidth, y: 1.5 * scaledBaseSize },
    [Direction.SouthWest]: { x: -0.5 * tileWidth, y: 1.5 * scaledBaseSize },
    [Direction.West]: { x: -tileWidth, y: 0 },
    // Composed children use same positions as their structural counterparts
    [Direction.ComposedNorthWest]: { x: -0.5 * tileWidth, y: -1.5 * scaledBaseSize },
    [Direction.ComposedNorthEast]: { x: 0.5 * tileWidth, y: -1.5 * scaledBaseSize },
    [Direction.ComposedEast]: { x: tileWidth, y: 0 },
    [Direction.ComposedSouthEast]: { x: 0.5 * tileWidth, y: 1.5 * scaledBaseSize },
    [Direction.ComposedSouthWest]: { x: -0.5 * tileWidth, y: 1.5 * scaledBaseSize },
    [Direction.ComposedWest]: { x: -tileWidth, y: 0 },
  };
}
