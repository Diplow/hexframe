/**
 * Spatial direction calculations for neighbor positioning
 */

import { CoordSystem, Direction } from "~/lib/domains/mapping/utils";

// Calculate the spatial direction from center to target
// This determines WHERE the target appears relative to the new center
export function calculateSpatialDirection(centerCoordId: string, targetCoordId: string): Direction {
  const centerCoord = CoordSystem.parseId(centerCoordId);
  const targetCoord = CoordSystem.parseId(targetCoordId);

  // If target is parent (shorter path)
  if (targetCoord.path.length < centerCoord.path.length) {
    const centerDirection = centerCoord.path[centerCoord.path.length - 1]!;
    return _getOppositeDirection(centerDirection);
  }

  // If target is sibling (same path length), calculate relative position
  if (targetCoord.path.length === centerCoord.path.length) {
    const centerDirection = centerCoord.path[centerCoord.path.length - 1]!;
    const targetDirection = targetCoord.path[targetCoord.path.length - 1]!;
    return _calculateRelativeDirection(centerDirection, targetDirection);
  }

  // If target is child (longer path), it would be in its own direction
  // But we shouldn't have children in this neighbor system
  return Direction.Center;
}

function _calculateRelativeDirection(centerDir: Direction, targetDir: Direction): Direction {
  // Map the hexagonal layout relationships
  // Composed children (negative directions) behave the same as structural children
  const hexLayout: Record<Direction, Partial<Record<Direction, Direction>>> = {
    [Direction.Center]: {},
    [Direction.NorthWest]: {
      [Direction.West]: Direction.SouthWest,
      [Direction.Center]: Direction.SouthEast,
      [Direction.NorthEast]: Direction.East,
    },
    [Direction.NorthEast]: {
      [Direction.NorthWest]: Direction.West,
      [Direction.Center]: Direction.SouthWest,
      [Direction.East]: Direction.SouthEast,
    },
    [Direction.East]: {
      [Direction.NorthEast]: Direction.NorthWest,
      [Direction.Center]: Direction.West,
      [Direction.SouthEast]: Direction.SouthWest,
    },
    [Direction.SouthEast]: {
      [Direction.East]: Direction.NorthEast,
      [Direction.Center]: Direction.NorthWest,
      [Direction.SouthWest]: Direction.West,
    },
    [Direction.SouthWest]: {
      [Direction.SouthEast]: Direction.East,
      [Direction.Center]: Direction.NorthEast,
      [Direction.West]: Direction.NorthWest,
    },
    [Direction.West]: {
      [Direction.SouthWest]: Direction.SouthEast,
      [Direction.Center]: Direction.East,
      [Direction.NorthWest]: Direction.NorthEast,
    },
    // Composed children use empty partial records (not used in neighbor positioning)
    [Direction.ComposedNorthWest]: {},
    [Direction.ComposedNorthEast]: {},
    [Direction.ComposedEast]: {},
    [Direction.ComposedSouthEast]: {},
    [Direction.ComposedSouthWest]: {},
    [Direction.ComposedWest]: {},
  };

  return hexLayout[centerDir]?.[targetDir] ?? Direction.Center;
}

function _getOppositeDirection(direction: Direction): Direction {
  switch (direction) {
    case Direction.NorthWest:
      return Direction.SouthEast;
    case Direction.NorthEast:
      return Direction.SouthWest;
    case Direction.East:
      return Direction.West;
    case Direction.SouthEast:
      return Direction.NorthWest;
    case Direction.SouthWest:
      return Direction.NorthEast;
    case Direction.West:
      return Direction.East;
    default:
      return Direction.Center;
  }
}
