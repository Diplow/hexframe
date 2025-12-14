/**
 * Coordinate calculation helpers for neighbor tiles
 */

import type { TileData } from "~/app/map/types/tile-data";
import { CoordSystem, Direction } from "~/lib/domains/mapping/utils";

export function getSiblingCoordIds(centerItem: TileData): string[] {
  const coord = centerItem.metadata.coordinates;

  // Root tile has no siblings
  if (coord.path.length === 0) return [];

  const parentPath = coord.path.slice(0, -1);
  const currentDirection = coord.path[coord.path.length - 1];

  if (!currentDirection) return [];

  // Get only the adjacent directions for the current position
  const adjacentDirections = getAdjacentDirections(currentDirection);
  const siblings: string[] = [];

  // Generate coordinates for only the adjacent siblings
  for (const direction of adjacentDirections) {
    const siblingCoord = {
      userId: coord.userId,
      groupId: coord.groupId,
      path: [...parentPath, direction]
    };

    siblings.push(CoordSystem.createId(siblingCoord));
  }

  return siblings;
}

export function getParentCoordId(centerItem: TileData): string | null {
  const coord = centerItem.metadata.coordinates;

  // Root tile has no parent
  if (coord.path.length === 0) return null;

  const parentCoord = {
    userId: coord.userId,
    groupId: coord.groupId,
    path: coord.path.slice(0, -1)
  };

  return CoordSystem.createId(parentCoord);
}

function getAdjacentDirections(direction: Direction): Direction[] {
  switch (direction) {
    case Direction.NorthWest:
      return [Direction.NorthEast, Direction.West];
    case Direction.NorthEast:
      return [Direction.NorthWest, Direction.East];
    case Direction.East:
      return [Direction.NorthEast, Direction.SouthEast];
    case Direction.SouthEast:
      return [Direction.East, Direction.SouthWest];
    case Direction.SouthWest:
      return [Direction.SouthEast, Direction.West];
    case Direction.West:
      return [Direction.SouthWest, Direction.NorthWest];
    default:
      return [];
  }
}
