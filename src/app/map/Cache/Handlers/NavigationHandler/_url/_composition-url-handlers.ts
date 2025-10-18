import type { Dispatch } from "react";
import type { CacheAction, CacheState } from "~/app/map/Cache/State";
import { cacheActions } from "~/app/map/Cache/State";
import { loggers } from "~/lib/debug/debug-logger";
import { buildMapUrl } from "~/app/map/Cache/Handlers/NavigationHandler/_core/navigation-core";

/**
 * Toggle composition expansion and update URL accordingly
 */
export function toggleCompositionExpansionWithURL(
  coordId: string,
  getState: () => CacheState,
  dispatch: Dispatch<CacheAction>
): void {
  loggers.mapCache.handlers('[NavigationHandler.toggleCompositionExpansionWithURL] Called with:', {
    coordId,
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

  // Toggle the coordId in the composition expanded list
  const currentCompositionExpanded = [...state.compositionExpandedIds];
  const index = currentCompositionExpanded.indexOf(coordId);

  if (index > -1) {
    currentCompositionExpanded.splice(index, 1);
  } else {
    currentCompositionExpanded.push(coordId);
  }

  // Update the cache state
  dispatch(cacheActions.toggleCompositionExpansion(coordId));

  // Update URL using native history API to avoid React re-renders
  if (typeof window !== 'undefined') {
    const newUrl = buildMapUrl(
      centerItem.metadata.dbId,
      state.expandedItemIds,
      currentCompositionExpanded,
    );
    window.history.replaceState({}, '', newUrl);
  }
}
