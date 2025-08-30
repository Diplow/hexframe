import type { Coord } from "~/lib/domains/mapping/utils";

/**
 * Generates a test ID for a tile based on its coordinates
 * Format: "tile-{userId}-{groupId}" for root, "tile-{userId}-{groupId}-{path}" for children
 */
export function generateTileTestId(coordinates: Coord): string {
  const baseId = `tile-${coordinates.userId}-${coordinates.groupId}`;
  
  if (coordinates.path.length === 0) {
    return baseId;
  }
  
  const pathString = coordinates.path.join("");
  return `${baseId}-${pathString}`;
}