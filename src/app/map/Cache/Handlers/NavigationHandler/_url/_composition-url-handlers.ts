import type { Dispatch } from "react";
import type { CacheAction, CacheState } from "~/app/map/Cache/State";
import { cacheActions } from "~/app/map/Cache/State";
import { loggers } from "~/lib/debug/debug-logger";
import { buildMapUrl } from "~/app/map/Cache/Handlers/NavigationHandler/_core/navigation-core";

/**
 * Toggle composition expansion and update URL accordingly
 * Only affects the current center tile
 */
export function toggleCompositionExpansionWithURL(
  getState: () => CacheState,
  dispatch: Dispatch<CacheAction>
): void {
  loggers.mapCache.handlers('[NavigationHandler.toggleCompositionExpansionWithURL] Called:', {
    timestamp: new Date().toISOString(),
    stackTrace: new Error().stack
  });
  const state = getState();
  const centerItem = state.currentCenter
    ? state.itemsById[state.currentCenter]
    : null;

  if (!centerItem) {
    return;
  }

  // Toggle the composition expanded state
  const newCompositionExpanded = !state.isCompositionExpanded;

  // Update the cache state
  dispatch(cacheActions.toggleCompositionExpansion());

  // Update URL using native history API to avoid React re-renders
  if (typeof window !== 'undefined') {
    const newUrl = buildMapUrl(
      centerItem.metadata.dbId,
      state.expandedItemIds,
      newCompositionExpanded,
    );
    window.history.replaceState({}, '', newUrl);
  }
}
