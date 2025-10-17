import type { CacheAction } from "~/app/map/Cache/State/types";
import { ACTION_TYPES } from "~/app/map/Cache/State/types";

// ============================================================================
// COMPOSITION EXPANSION ACTION CREATORS - Toggle composition view
// ============================================================================

/**
 * Toggle the composition expansion state for a tile.
 *
 * Adds the coordId to compositionExpandedIds if not present, or removes it if present.
 *
 * @param coordId - The coordinate ID of the tile to toggle
 * @returns CacheAction to toggle composition expansion
 */
export const toggleCompositionExpansion = (coordId: string): CacheAction => ({
  type: ACTION_TYPES.TOGGLE_COMPOSITION_EXPANSION,
  payload: coordId,
});

/**
 * Set the composition expansion state for a tile explicitly.
 *
 * Adds coordId to compositionExpandedIds if isExpanded=true, or removes if isExpanded=false.
 *
 * @param coordId - The coordinate ID of the tile
 * @param isExpanded - Whether the composition should be expanded
 * @returns CacheAction to set composition expansion state
 */
export const setCompositionExpansion = (
  coordId: string,
  isExpanded: boolean
): CacheAction => ({
  type: ACTION_TYPES.SET_COMPOSITION_EXPANSION,
  payload: {
    coordId,
    isExpanded,
  },
});

/**
 * Clear all composition expansions.
 *
 * Resets compositionExpandedIds to an empty array.
 *
 * @returns CacheAction to clear all composition expansions
 */
export const clearCompositionExpansions = (): CacheAction => ({
  type: ACTION_TYPES.CLEAR_COMPOSITION_EXPANSIONS,
});
