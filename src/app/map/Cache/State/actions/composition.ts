import type { CacheAction } from "~/app/map/Cache/State/types";
import { ACTION_TYPES } from "~/app/map/Cache/State/types";

// ============================================================================
// COMPOSITION EXPANSION ACTION CREATORS - Toggle composition view
// ============================================================================

/**
 * Toggle the composition expansion state for the current center tile.
 *
 * Flips the boolean isCompositionExpanded state.
 *
 * @returns CacheAction to toggle composition expansion
 */
export const toggleCompositionExpansion = (): CacheAction => ({
  type: ACTION_TYPES.TOGGLE_COMPOSITION_EXPANSION,
});

/**
 * Set the composition expansion state explicitly.
 *
 * Sets isCompositionExpanded to the provided boolean value.
 *
 * @param isExpanded - Whether the composition should be expanded
 * @returns CacheAction to set composition expansion state
 */
export const setCompositionExpansion = (
  isExpanded: boolean
): CacheAction => ({
  type: ACTION_TYPES.SET_COMPOSITION_EXPANSION,
  payload: isExpanded,
});
