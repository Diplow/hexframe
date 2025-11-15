import { Direction } from "~/lib/domains/mapping/utils";

// Re-export Direction for convenience
export { Direction };

// Map-related constants used across components

// Default colors for map items - maps each hex direction to a Tailwind color name
export const DEFAULT_MAP_COLORS: Record<Direction, string> = {
  [Direction.Center]: "zinc",
  [Direction.NorthWest]: "amber",
  [Direction.NorthEast]: "green",
  [Direction.East]: "cyan",
  [Direction.SouthEast]: "indigo",
  [Direction.SouthWest]: "purple",
  [Direction.West]: "rose",
  // Composed children (negative directions) use slightly different shades
  [Direction.ComposedNorthWest]: "amber",
  [Direction.ComposedNorthEast]: "green",
  [Direction.ComposedEast]: "cyan",
  [Direction.ComposedSouthEast]: "indigo",
  [Direction.ComposedSouthWest]: "purple",
  [Direction.ComposedWest]: "rose",
} as const;

// Hierarchy tile sizing constants
export const HIERARCHY_TILE_BASE_SIZE = 56;
export const HIERARCHY_TILE_SCALE = 1;
