/**
 * Utility functions for working with the Hexframe color system
 */

/**
 * Convert CSS variable to Tailwind-compatible RGB format
 * Used for arbitrary color values in Tailwind classes
 */
export function cssVarToRgb(cssVar: string): string {
  return `rgb(var(${cssVar}))`;
}

/**
 * Get Tailwind class for link colors
 */
export const linkClasses = "text-link hover:text-link/80";

/**
 * Get Tailwind class for destructive colors
 */
export const destructiveClasses = "text-destructive hover:text-destructive/80";

/**
 * Get Tailwind class for success colors
 */
export const successClasses = "text-success hover:text-success/80";

/**
 * Get Tailwind class for secondary/warning colors
 */
export const secondaryClasses = "text-secondary hover:text-secondary/80";