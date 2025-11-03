import type { MapItemContract } from "~/lib/domains/mapping/types/contracts";

/**
 * Strategy for fetching context around a center tile
 */
export interface ContextStrategy {
  includeParent: boolean;       // Include parent tile
  includeComposed: boolean;      // Include direction 0 tiles
  includeChildren: boolean;      // Include depth 1 children
  includeGrandchildren: boolean; // Include depth 2 grandchildren
}

/**
 * Context data for AI operations
 * Contains center tile plus surrounding tiles based on strategy
 */
export interface MapContext {
  center: MapItemContract;
  parent: MapItemContract | null;
  composed: MapItemContract[];     // Direction 0 tiles
  children: MapItemContract[];     // Depth 1 from center
  grandchildren: MapItemContract[]; // Depth 2 from center
}

/**
 * Predefined context strategies for common use cases
 */
export const ContextStrategies = {
  /**
   * Minimal context: just center + parent
   */
  MINIMAL: {
    includeParent: true,
    includeComposed: false,
    includeChildren: false,
    includeGrandchildren: false,
  } as ContextStrategy,

  /**
   * Standard context: center + parent + composed + children
   */
  STANDARD: {
    includeParent: true,
    includeComposed: true,
    includeChildren: true,
    includeGrandchildren: false,
  } as ContextStrategy,

  /**
   * Extended context: all levels
   */
  EXTENDED: {
    includeParent: true,
    includeComposed: true,
    includeChildren: true,
    includeGrandchildren: true,
  } as ContextStrategy,

  /**
   * Focused context: no parent, no grandchildren
   */
  FOCUSED: {
    includeParent: false,
    includeComposed: true,
    includeChildren: true,
    includeGrandchildren: false,
  } as ContextStrategy,
} as const;
