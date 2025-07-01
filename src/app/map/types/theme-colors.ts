import { Direction } from '../constants';

// Map Direction enum to CSS class abbreviations
export const directionToClassAbbr: Record<Direction, string> = {
  [Direction.Center]: 'center',
  [Direction.NorthWest]: 'nw',
  [Direction.NorthEast]: 'ne',
  [Direction.East]: 'e',
  [Direction.SouthEast]: 'se',
  [Direction.SouthWest]: 'sw',
  [Direction.West]: 'w',
};

// Get semantic color class for a given direction and depth
export function getSemanticColorClass(direction: Direction, depth: number): string {
  const abbr = directionToClassAbbr[direction];
  
  // Center tiles use depth-0 for the root
  if (direction === Direction.Center && depth === 0) {
    return `${abbr}-depth-0`;
  }
  
  // Clamp depth to max 8
  const clampedDepth = Math.min(depth, 8);
  
  return `${abbr}-depth-${clampedDepth}`;
}

// Get text color class based on depth (for contrast)
export function getTextColorForDepth(depth: number): string {
  // For deeper tiles (depth 5+), we need light text on dark backgrounds
  // In dark mode, this inverts: dark text on light backgrounds
  if (depth >= 5) {
    return 'text-white dark:text-gray-900';
  }
  // For shallower tiles, use dark text on light backgrounds
  // In dark mode: light text on dark backgrounds
  return 'text-gray-900 dark:text-gray-100';
}