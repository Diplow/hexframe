import type { Dispatch } from "react";
import type { CacheAction, CacheState } from "~/app/map/Cache/State";
import { cacheActions } from "~/app/map/Cache/State";
import type { DataOperations } from "~/app/map/Cache/types/handlers";
import type { ServerService } from "~/app/map/Cache/Services";
import type { EventBusService } from '~/app/map';
import { adapt, type TileData } from "~/app/map/types";
import { loggers } from "~/lib/debug/debug-logger";
import { validateDatabaseId } from "~/app/map/Cache/Handlers/NavigationHandler/_helpers/_validation/database-validator";
import { loadRegionForItem } from "~/app/map/Cache/Handlers/NavigationHandler/_helpers/_loading/region-loader";

export interface NavigationResult {
  success: boolean;
  error?: Error;
  centerUpdated?: boolean;
  urlUpdated?: boolean;
}

export interface NavigationOptions {
  pushToHistory?: boolean;
}

export interface NavigationDependencies {
  getState: () => CacheState;
  dispatch: Dispatch<CacheAction>;
  dataHandler: DataOperations;
  serverService: ServerService | undefined;
  eventBus: EventBusService | undefined;
  resolveItemIdentifier: (identifier: string) => { existingItem: TileData | undefined; resolvedCoordId: string | undefined };
  loadItemFromServer: (identifier: string) => Promise<{ loadedItem: TileData | null; loadedCoordId: string | null }>;
  updateExpandedItems: (coordId: string) => string[];
  handleURLUpdate: (item: TileData | undefined, coordId: string, expandedIds: string[]) => Promise<{ urlUpdated: boolean }>;
  performBackgroundTasks: (coordId: string) => void;
  emitNavigationEvent: (fromCenter: string | null, toCoordId: string) => void;
}

/**
 * Core navigation operation that coordinates all navigation steps
 */
export async function executeNavigationToItem(
  itemIdentifier: string,
  options: NavigationOptions,
  deps: NavigationDependencies
): Promise<NavigationResult> {
  loggers.mapCache.handlers('[Navigation] 🎯 Starting navigation to identifier:', { itemIdentifier });

  try {
    // 1. Resolve item identifier
    const { existingItem, resolvedCoordId } = deps.resolveItemIdentifier(itemIdentifier);

    // 2. Try to load from server if not found
    let finalItem = existingItem;
    let finalCoordId = resolvedCoordId;

    if (!existingItem && deps.serverService) {
      loggers.mapCache.handlers('[Navigation] 🔄 Item not in cache, attempting to load from server...');
      try {
        const { loadedItem, loadedCoordId } = await deps.loadItemFromServer(itemIdentifier);
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
      return await handleNavigationWithoutItem(itemIdentifier, finalCoordId, deps.getState, deps.dispatch, deps.eventBus);
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
    const currentState = deps.getState();
    const filteredExpandedDbIds = deps.updateExpandedItems(finalCoordId);

    // 7. Update center
    const previousCenter = currentState.currentCenter;
    deps.dispatch(cacheActions.setCenter(finalCoordId));

    // 8. Handle URL update
    const { urlUpdated } = await deps.handleURLUpdate(finalItem, finalCoordId, filteredExpandedDbIds);

    // 9. Emit navigation event
    if (finalCoordId) {
      deps.emitNavigationEvent(previousCenter, finalCoordId);
    }

    // 10. Background tasks
    deps.performBackgroundTasks(finalCoordId);

    return { success: true, centerUpdated: true, urlUpdated };
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    deps.dispatch(cacheActions.setError(errorObj));
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
  dispatch: Dispatch<CacheAction>,
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
  dispatch: Dispatch<CacheAction>
): Promise<{ loadedItem: TileData | null; loadedCoordId: string | null }> {
  const dbIdNumber = validateDatabaseId(itemIdentifier);
  if (dbIdNumber === null) {
    return { loadedItem: null, loadedCoordId: null };
  }

  const loadedItem = await serverService.getRootItemById(dbIdNumber);

  if (!loadedItem) {
    return { loadedItem: null, loadedCoordId: null };
  }

  loggers.mapCache.handlers(`✅ Successfully loaded item from server`, {
    dbId: loadedItem.id,
    coordId: loadedItem.coordinates,
    title: loadedItem.title
  });

  await loadRegionForItem(loadedItem, serverService, dispatch);

  const adaptedItem = adapt(loadedItem);

  loggers.mapCache.handlers('[Navigation] ✅ Using loaded item data for navigation');

  return { loadedItem: adaptedItem, loadedCoordId: loadedItem.coordinates };
}