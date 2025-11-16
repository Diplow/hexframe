import { MAPPING_ERRORS } from "~/lib/domains/mapping/types/errors";

// Represents a direction from a parent hex to its child hexes
export enum Direction {
  Center = 0,
  NorthWest = 1,
  NorthEast = 2,
  East = 3,
  SouthEast = 4,
  SouthWest = 5,
  West = 6,
  // Negative directions for composed children
  ComposedNorthWest = -1,
  ComposedNorthEast = -2,
  ComposedEast = -3,
  ComposedSouthEast = -4,
  ComposedSouthWest = -5,
  ComposedWest = -6,
}

// Represents a hex's position in the hierarchy
export interface Coord {
  // Base grid position
  userId: number;
  groupId: number;
  // Array of directions taken from root hex to reach this hex
  // Empty for base grid hexes
  path: Direction[];
}

export class CoordSystem {
  static getCenterCoord(userId: number, groupId = 0): Coord {
    return {
      userId,
      groupId,
      path: [],
    };
  }

  static getScaleFromDepth(coordId: string, depth: number): number {
    const coord = CoordSystem.parseId(coordId);
    return depth - coord.path.length + 1;
  }

  static isCenter(coord: Coord): boolean {
    return coord.path.length === 0;
  }

  static isCenterId(id: string): boolean {
    // Center ID will not contain ':' if path is empty,
    // and path is the only part after ':'
    return !id.includes(":") || id.endsWith(":");
  }

  static getDepthFromId(id: string): number {
    const coord = CoordSystem.parseId(id);
    return coord.path.length;
  }

  static getSiblingsFromId(coordId: string): string[] {
    const parentId = CoordSystem.getParentCoordFromId(coordId);
    if (!parentId) {
      return []; // If there's no parent, there are no siblings
    }

    // Check if this is a composed child (has negative direction)
    const isComposed = CoordSystem.isComposedChildId(coordId);

    // Get siblings: either composed children or structural children
    const siblings = isComposed
      ? CoordSystem.getComposedChildCoordsFromId(parentId)
      : CoordSystem.getChildCoordsFromId(parentId);

    return siblings.filter((c) => c !== coordId);
  }

  static areCoordsEqual(coord1: Coord, coord2: Coord): boolean {
    return CoordSystem.createId(coord1) === CoordSystem.createId(coord2);
  }

  static getDirection(coord: Coord): Direction {
    return coord.path[coord.path.length - 1] ?? Direction.Center;
  }

  static createId(coord: Coord): string {
    const base = `${coord.userId},${coord.groupId}`;
    if (coord.path.length === 0) return base;
    return `${base}:${coord.path.join(",")}`;
  }

  static parseId(id: string): Coord {
    const parts = id.split(":");
    const basePart = parts[0];
    const pathPart = parts.length > 1 ? parts[1] : "";

    if (!basePart) throw new Error(MAPPING_ERRORS.INVALID_HEX_ID);

    const [userIdStr, groupIdStr] = basePart.split(",");
    const userId = parseInt(userIdStr ?? "0", 10);
    const groupId = parseInt(groupIdStr ?? "0", 10);

    if (isNaN(userId) || isNaN(groupId)) {
      throw new Error(
        MAPPING_ERRORS.INVALID_HEX_ID + " - Malformed userId or groupId",
      );
    }

    return {
      userId,
      groupId,
      path: pathPart ? (pathPart.split(",").map(Number) as Direction[]) : [],
    };
  }

  static getCompositionCoord(parent: Coord): Coord {
    return {
      userId: parent.userId,
      groupId: parent.groupId,
      path: [...parent.path, Direction.Center],
    };
  }

  static getCompositionCoordFromId(parentId: string): string {
    const parent = CoordSystem.parseId(parentId);
    const compositionCoord = CoordSystem.getCompositionCoord(parent);
    return CoordSystem.createId(compositionCoord);
  }

  static getChildCoordsFromId(
    parentId: string,
    includeComposition: true,
  ): [string, string, string, string, string, string, string];
  static getChildCoordsFromId(
    parentId: string,
    includeComposition?: false,
  ): [string, string, string, string, string, string];
  static getChildCoordsFromId(
    parentId: string,
    includeComposition?: boolean,
  ): string[] {
    const parentCoord = CoordSystem.parseId(parentId);

    if (includeComposition) {
      const coords = CoordSystem.getChildCoords(parentCoord, true);
      return coords.map((coord) => CoordSystem.createId(coord));
    }

    const coords = CoordSystem.getChildCoords(parentCoord);
    return coords.map((coord) => CoordSystem.createId(coord));
  }

  static getChildCoords(
    parent: Coord,
    includeComposition: true,
  ): [Coord, Coord, Coord, Coord, Coord, Coord, Coord];
  static getChildCoords(
    parent: Coord,
    includeComposition?: false,
  ): [Coord, Coord, Coord, Coord, Coord, Coord];
  static getChildCoords(
    parent: Coord,
    includeComposition?: boolean,
  ): Coord[] {
    const structuralChildren: [Coord, Coord, Coord, Coord, Coord, Coord] = [
      // Surrounding children
      { ...parent, path: [...parent.path, Direction.NorthWest] },
      { ...parent, path: [...parent.path, Direction.NorthEast] },
      { ...parent, path: [...parent.path, Direction.East] },
      { ...parent, path: [...parent.path, Direction.SouthEast] },
      { ...parent, path: [...parent.path, Direction.SouthWest] },
      { ...parent, path: [...parent.path, Direction.West] },
    ];

    if (includeComposition) {
      const compositionChild = CoordSystem.getCompositionCoord(parent);
      return [compositionChild, ...structuralChildren];
    }

    return structuralChildren;
  }

  static getParentCoordFromId(id: string): string | undefined {
    const coord = CoordSystem.parseId(id);
    const parent = CoordSystem.getParentCoord(coord);
    if (!parent) return undefined;
    return CoordSystem.createId(parent);
  }

  static getParentCoord(coord: Coord): Coord | null {
    if (coord.path.length === 0) return null;
    return {
      userId: coord.userId,
      groupId: coord.groupId,
      path: coord.path.slice(0, -1),
    };
  }

  static getZoomLevel(coord: Coord): number {
    return coord.path.length;
  }

  static getNeighborCoord(coord: Coord, direction: Direction): Coord {
    return {
      userId: coord.userId,
      groupId: coord.groupId,
      path: [...coord.path, direction],
    }; // Return neighbor on the same path level
  }

  static getHexSize(baseSize?: number): number {
    return baseSize ?? 120; // Use provided size or default to 120
  }

  static isAdjacent(coord1: Coord, coord2: Coord): boolean {
    // Check if two hexes share an edge
    if (coord1.path.length !== coord2.path.length) return false;
    if (coord1.userId !== coord2.userId || coord1.groupId !== coord2.groupId)
      return false;

    // Compare paths up to the last element
    for (let i = 0; i < coord1.path.length - 1; i++) {
      if (coord1.path[i] !== coord2.path[i]) return false;
    }

    // Get the last directions
    const dir1 = coord1.path[coord1.path.length - 1] ?? -1;
    const dir2 = coord2.path[coord2.path.length - 1] ?? -1;

    // Adjacent hexes will have complementary directions
    return (
      (dir1 === Direction.NorthWest && dir2 === Direction.SouthEast) ||
      (dir1 === Direction.NorthEast && dir2 === Direction.SouthWest) ||
      (dir1 === Direction.SouthEast && dir2 === Direction.NorthWest) ||
      (dir1 === Direction.SouthWest && dir2 === Direction.NorthEast) ||
      (dir1 === Direction.West && dir2 === Direction.East) ||
      (dir1 === Direction.East && dir2 === Direction.West)
    );
  }

  static isDescendant(childId: string, parentId: string): boolean {
    // A tile is a descendant if its coordId starts with the parent's coordId
    // Handle special cases for tiles without paths
    if (parentId.includes(":")) {
      return childId.startsWith(parentId + ",") || childId === parentId;
    } else {
      return childId.startsWith(parentId + ":");
    }
  }

  static isAncestor(parentId: string, childId: string): boolean {
    // An ancestor check is just the inverse of descendant
    return CoordSystem.isDescendant(childId, parentId);
  }

  static getComposedChildCoords(
    parent: Coord,
  ): [Coord, Coord, Coord, Coord, Coord, Coord] {
    const composedChildren: [Coord, Coord, Coord, Coord, Coord, Coord] = [
      { ...parent, path: [...parent.path, Direction.ComposedNorthWest] },
      { ...parent, path: [...parent.path, Direction.ComposedNorthEast] },
      { ...parent, path: [...parent.path, Direction.ComposedEast] },
      { ...parent, path: [...parent.path, Direction.ComposedSouthEast] },
      { ...parent, path: [...parent.path, Direction.ComposedSouthWest] },
      { ...parent, path: [...parent.path, Direction.ComposedWest] },
    ];

    return composedChildren;
  }

  static getComposedChildCoordsFromId(
    parentId: string,
  ): [string, string, string, string, string, string] {
    const parentCoord = CoordSystem.parseId(parentId);
    const coords = CoordSystem.getComposedChildCoords(parentCoord);
    return coords.map((coord) =>
      CoordSystem.createId(coord),
    ) as [string, string, string, string, string, string];
  }

  static isComposedChild(coord: Coord): boolean {
    return coord.path.some((direction) => (direction as number) < 0);
  }

  static isComposedChildId(id: string): boolean {
    const coord = CoordSystem.parseId(id);
    return CoordSystem.isComposedChild(coord);
  }
}

// Standalone utility functions for backward compatibility
export function getNeighborCoord(coord: Coord, direction: Direction): Coord {
  return CoordSystem.getNeighborCoord(coord, direction);
}

export function isValidCoord(coord: Coord): boolean {
  return coord.userId > 0 && coord.groupId >= 0 && Array.isArray(coord.path);
}

export function coordToString(coord: Coord): string {
  return CoordSystem.createId(coord);
}

export function stringToCoord(coordId: string): Coord {
  return CoordSystem.parseId(coordId);
}

/**
 * Validates that a coordinate ID is safe for use in CSS selectors
 *
 * Valid coordId format: "userId,groupId" or "userId,groupId:path"
 * where userId and groupId are positive integers,
 * and path is comma-separated integers (can be negative for composed children)
 *
 * @param coordId - The coordinate ID to validate
 * @returns true if coordId is safe for CSS selectors
 *
 * @example
 * isValidCoordId("1,0") // true
 * isValidCoordId("1,0:1,2,3") // true
 * isValidCoordId("1,0:1,-2,3") // true (composed child)
 * isValidCoordId("1,0:1'];alert('xss')") // false
 */
export function isValidCoordId(coordId: string): boolean {
  // Valid format: userId,groupId or userId,groupId:path
  // userId and groupId must be non-negative integers
  // path is comma-separated integers (can be negative)
  const coordIdPattern = /^[0-9]+,[0-9]+(?::[-0-9,]+)?$/;
  return coordIdPattern.test(coordId);
}
