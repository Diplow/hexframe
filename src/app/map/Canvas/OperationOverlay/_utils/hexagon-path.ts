/**
 * Generate SVG path for hexagon shape matching tile hexagons
 * Uses the exact same path as BaseTileLayout: M50 0 L100 28.87 L100 86.6 L50 115.47 L0 86.6 L0 28.87Z
 * This path is defined in a 100x115.47 viewBox and is scaled to match tile size
 *
 * @returns SVG path string (always the same, scaling is handled by viewBox)
 */
export function generateHexagonPath(): string {
  // Exact path from BaseTileLayout
  return "M50 0 L100 28.87 L100 86.6 L50 115.47 L0 86.6 L0 28.87Z";
}

/**
 * Get viewBox for hexagon SVG
 * Uses the exact same viewBox as BaseTileLayout
 */
export function getHexagonViewBox(): string {
  return "0 0 100 115.47";
}
