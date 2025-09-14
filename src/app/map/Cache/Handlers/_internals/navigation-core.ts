import type { CacheAction, CacheState } from "~/app/map/Cache/State";
import { cacheActions } from "~/app/map/Cache/State";
import type { DataOperations } from "~/app/map/Cache/types/handlers";
import type { ServerService } from "~/app/map/Cache/Services/types";
import type { EventBusService } from '~/app/map';
import { adapt, type TileData } from "~/app/map/types";
import { loggers } from "~/lib/debug/debug-logger";
import { type MapItemType } from "~/lib/domains/mapping";

export interface NavigationResult {
  success: boolean;
  error?: Error;
  centerUpdated?: boolean;
  urlUpdated?: boolean;
}

export interface NavigationOptions {
  pushToHistory?: boolean;
}

/**
 * Core navigation operation that coordinates all navigation steps
 */
export async function executeNavigationToItem(
  itemIdentifier: string,
  options: NavigationOptions,
  getState: () => CacheState,
  dispatch: React.Dispatch<CacheAction>,
  dataHandler: DataOperations,
  serverService: ServerService | undefined,
  eventBus: EventBusService | undefined,
  resolveItemIdentifier: (identifier: string) => { existingItem: TileData | undefined; resolvedCoordId: string | undefined },
  loadItemFromServer: (identifier: string) => Promise<{ loadedItem: TileData | null; loadedCoordId: string | null }>,
  updateExpandedItems: (coordId: string) => string[],
  handleURLUpdate: (item: TileData | undefined, coordId: string, expandedIds: string[]) => Promise<{ urlUpdated: boolean }>,
  performBackgroundTasks: (coordId: string) => void,
  emitNavigationEvent: (fromCenter: string | null, toCoordId: string) => void
): Promise<NavigationResult> {
  loggers.mapCache.handlers('[Navigation] 🎯 Starting navigation to identifier:', { itemIdentifier });

  try {
    // 1. Resolve item identifier
    const { existingItem, resolvedCoordId } = resolveItemIdentifier(itemIdentifier);

    // 2. Try to load from server if not found
    let finalItem = existingItem;
    let finalCoordId = resolvedCoordId;

    if (!existingItem && serverService) {
      loggers.mapCache.handlers('[Navigation] 🔄 Item not in cache, attempting to load from server...');
      try {
        const { loadedItem, loadedCoordId } = await loadItemFromServer(itemIdentifier);
        if (loadedItem && loadedCoordId) {
          finalItem = loadedItem;
          finalCoordId = loadedCoordId;
        }
      } catch (error) {
        console.error('[Navigation] ❌ Failed to load item from server:', error);
      }
    }

    // 3. Handle navigation without item in cache
    if (!finalItem && finalCoordId) {
      return await handleNavigationWithoutItem(itemIdentifier, finalCoordId, getState, dispatch, eventBus);
    }

    // 4. Return early if no item found
    if (!finalItem && !finalCoordId) {
      loggers.mapCache.handlers('[Navigation] ❌ Cannot navigate - item not found and no coordinate available');
      return { success: false, centerUpdated: false, urlUpdated: false };
    }

    // 5. Ensure we have a coordinate ID
    if (!finalCoordId && finalItem) {
      finalCoordId = finalItem.metadata.coordId;
    }

    if (!finalCoordId) {
      return { success: false, centerUpdated: false, urlUpdated: false };
    }

    // 6. Update expanded items for navigation
    const currentState = getState();
    const filteredExpandedDbIds = updateExpandedItems(finalCoordId);

    // 7. Update center
    const previousCenter = currentState.currentCenter;
    dispatch(cacheActions.setCenter(finalCoordId));

    // 8. Handle URL update
    const { urlUpdated } = await handleURLUpdate(finalItem, finalCoordId, filteredExpandedDbIds);

    // 9. Emit navigation event
    if (finalCoordId) {
      emitNavigationEvent(previousCenter, finalCoordId);
    }

    // 10. Background tasks
    performBackgroundTasks(finalCoordId);

    return { success: true, centerUpdated: true, urlUpdated };
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    dispatch(cacheActions.setError(errorObj));
    return { success: false, error: errorObj, centerUpdated: false, urlUpdated: false };
  }
}

/**
 * Handle navigation when item is not found in cache but coordinate is available
 */
export async function handleNavigationWithoutItem(
  itemIdentifier: string,
  loadedCoordId: string,
  getState: () => CacheState,
  dispatch: React.Dispatch<CacheAction>,
  eventBus?: EventBusService
): Promise<NavigationResult> {
  loggers.mapCache.handlers('[Navigation] 📍 Item loaded but not in cache yet, navigating to coordinate:', {
    loadedCoordId
  });

  dispatch(cacheActions.setCenter(loadedCoordId));

  if (eventBus) {
    eventBus.emit({
      type: 'map.navigation',
      source: 'map_cache',
      payload: {
        fromCenterId: getState().currentCenter ?? '',
        toCenterId: itemIdentifier,
        toCenterName: 'Your Map'
      }
    });
  }

  if (typeof window !== 'undefined') {
    const urlId = itemIdentifier.includes(',') || itemIdentifier.includes(':')
      ? itemIdentifier
      : itemIdentifier;
    const newUrl = buildMapUrl(urlId, []);
    window.history.pushState({}, '', newUrl);
  }

  return {
    success: true,
    centerUpdated: true,
    urlUpdated: true,
  };
}

/**
 * Build map URL with center and expanded items
 */
export function buildMapUrl(centerItemId: string, expandedItems: string[]): string {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "http://localhost:3000";

  const url = new URL("/map", origin);
  url.searchParams.set("center", centerItemId);

  if (expandedItems.length > 0) {
    url.searchParams.set("expandedItems", expandedItems.join(","));
  }

  return url.pathname + url.search;
}

/**
 * Load item from server by database ID
 */
export async function loadItemFromServer(
  itemIdentifier: string,
  serverService: ServerService,
  dispatch: React.Dispatch<CacheAction>
): Promise<{ loadedItem: TileData | null; loadedCoordId: string | null }> {
  if (itemIdentifier.includes(',') || itemIdentifier.includes(':')) {
    loggers.mapCache.handlers('[Navigation] Cannot load by coordinate ID from server');
    return { loadedItem: null, loadedCoordId: null };
  }

  const dbIdNumber = parseInt(itemIdentifier);
  if (isNaN(dbIdNumber)) {
    return { loadedItem: null, loadedCoordId: null };
  }

  const loadedItem = await serverService.getRootItemById(dbIdNumber);

  if (!loadedItem) {
    return { loadedItem: null, loadedCoordId: null };
  }

  loggers.mapCache.handlers(`✅ Successfully loaded item from server`, {
    dbId: loadedItem.id,
    coordId: loadedItem.coordinates,
    name: loadedItem.name
  });

  const loadedCoordId = loadedItem.coordinates;

  // Add the loaded item to cache using loadRegion action
  dispatch(cacheActions.loadRegion([{...loadedItem, itemType: loadedItem.itemType as MapItemType}], loadedCoordId, 0));

  // Convert the loaded item to the proper TileData format
  const adaptedItem = adapt({...loadedItem, itemType: loadedItem.itemType as MapItemType});

  loggers.mapCache.handlers('[Navigation] ✅ Using loaded item data for navigation');

  return { loadedItem: adaptedItem, loadedCoordId };
}