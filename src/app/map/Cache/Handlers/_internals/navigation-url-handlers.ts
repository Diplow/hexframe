import type { CacheAction, CacheState } from "~/app/map/Cache/State";
import { cacheActions } from "~/app/map/Cache/State";
import { loggers } from "~/lib/debug/debug-logger";
import { buildMapUrl } from "~/app/map/Cache/Handlers/_internals/navigation-core";

/**
 * URL management operations for navigation handler
 */

/**
 * Update browser URL with center item and expanded items
 */
export function updateURL(centerItemId: string, expandedItems: string[]): void {
  loggers.mapCache.handlers('[NavigationHandler.updateURL] Called with:', {
    centerItemId,
    expandedItems,
    timestamp: new Date().toISOString(),
    stackTrace: new Error().stack
  });
  if (typeof window !== 'undefined') {
    const newUrl = buildMapUrl(centerItemId, expandedItems);
    window.history.pushState({}, '', newUrl);
  }
}

/**
 * Sync URL with current cache state
 */
export function syncURLWithState(getState: () => CacheState): void {
  loggers.mapCache.handlers('[NavigationHandler.syncURLWithState] Called:', {
    timestamp: new Date().toISOString(),
    stackTrace: new Error().stack
  });
  const state = getState();
  const centerItem = state.currentCenter
    ? state.itemsById[state.currentCenter]
    : null;

  if (centerItem && typeof window !== 'undefined') {
    const newUrl = buildMapUrl(
      centerItem.metadata.dbId,
      state.expandedItemIds,
    );
    window.history.replaceState({}, '', newUrl);
  }
}

/**
 * Get current map context from URL parameters
 */
export function getMapContext(
  configPathname?: string,
  configSearchParams?: URLSearchParams
): {
  centerItemId: string;
  expandedItems: string[];
  pathname: string;
  searchParams: URLSearchParams;
} {
  loggers.mapCache.handlers('[NavigationHandler.getMapContext] Called:', {
    timestamp: new Date().toISOString(),
    stackTrace: new Error().stack
  });
  const currentPathname = configPathname
    ?? (typeof window !== 'undefined' ? window.location.pathname : '');
  const currentSearchParams = configSearchParams
    ?? (typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams());

  // Extract center item ID from query params
  const centerItemId = currentSearchParams.get("center") ?? "";

  // Parse expanded items from query parameters
  const expandedItemsParam = currentSearchParams.get("expandedItems");
  const expandedItems = expandedItemsParam
    ? expandedItemsParam.split(",").filter(Boolean)
    : [];

  return {
    centerItemId,
    expandedItems,
    pathname: currentPathname,
    searchParams: currentSearchParams,
  };
}

/**
 * Toggle item expansion and update URL accordingly
 */
export function toggleItemExpansionWithURL(
  itemId: string,
  getState: () => CacheState,
  dispatch: React.Dispatch<CacheAction>
): void {
  loggers.mapCache.handlers('[NavigationHandler.toggleItemExpansionWithURL] Called with:', {
    itemId,
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

  // Toggle the item in the expanded list
  const currentExpanded = [...state.expandedItemIds];
  const index = currentExpanded.indexOf(itemId);
  
  if (index > -1) {
    currentExpanded.splice(index, 1);
  } else {
    currentExpanded.push(itemId);
  }

  // Update the cache state
  dispatch(cacheActions.toggleItemExpansion(itemId));
  
  // Update URL using native history API to avoid React re-renders
  if (typeof window !== 'undefined') {
    const newUrl = buildMapUrl(
      centerItem.metadata.dbId,
      currentExpanded,
    );
    window.history.replaceState({}, '', newUrl);
  }
}