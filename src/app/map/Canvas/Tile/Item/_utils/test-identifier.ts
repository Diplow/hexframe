import type { Coord } from "~/lib/domains/mapping/utils";

/**
 * Generates a test identifier for a tile based on its coordinates
 * Used for E2E testing to uniquely identify tiles in the DOM
 * 
 * @param coordinates - The tile's coordinate information
 * @returns A unique test ID string in format "tile-userId-groupId[-path]"
 */
export function generateTileTestId(coordinates: Coord): string {
  const pathPart = coordinates.path.length > 0 
    ? `-${coordinates.path.join("-")}` 
    : '';
  
  return `tile-${coordinates.userId}-${coordinates.groupId}${pathPart}`;
}