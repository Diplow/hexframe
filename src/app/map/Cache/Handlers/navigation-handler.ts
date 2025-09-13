import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { CacheAction, CacheState } from "~/app/map/Cache/State";
import { cacheActions } from "~/app/map/Cache/State";
import type { DataOperations, NavigationOperations } from "~/app/map/Cache/types/handlers";
import { CoordSystem } from "~/lib/domains/mapping/utils";
import type { ServerService } from "~/app/map/Cache/Services/types";
import { checkAncestors, loadAncestorsForItem } from "~/app/map/Cache/Handlers/ancestor-loader";
import type { EventBusService } from '~/app/map';
import { adapt, type TileData } from "~/app/map/types";
import { loggers } from "~/lib/debug/debug-logger";
import { type MapItemType } from "~/lib/domains/mapping/interface.client";

export interface NavigationHandlerConfig {
  dispatch: React.Dispatch<CacheAction>;
  getState: () => CacheState;
  dataHandler: DataOperations;
  serverService?: ServerService;
  eventBus?: EventBusService;
  // For testing, we can inject these dependencies
  router?: {
    push: (url: string) => void;
    replace: (url: string) => void;
  };
  searchParams?: URLSearchParams;
  pathname?: string;
}

export interface NavigationResult {
  success: boolean;
  error?: Error;
  centerUpdated?: boolean;
  urlUpdated?: boolean;
}

export interface NavigationOptions {
  pushToHistory?: boolean; // Whether to push to history (true) or replace (false)
}

// Helper functions for navigation operations
interface ItemResolutionResult {
  existingItem: TileData | undefined;
  resolvedCoordId: string | undefined;
}

function _resolveItemIdentifier(itemIdentifier: string, getState: () => CacheState): ItemResolutionResult {
  const allItems = Object.values(getState().itemsById);
  let existingItem: TileData | undefined;
  let resolvedCoordId: string | undefined;

  // Check if it's a coordinate ID (contains comma or colon)
  if (itemIdentifier.includes(',') || itemIdentifier.includes(':')) {
    loggers.mapCache.handlers('[Navigation] 🗺️ Identifier appears to be a coordinate ID');
    existingItem = getState().itemsById[itemIdentifier];
    resolvedCoordId = itemIdentifier;

    if (existingItem) {
      loggers.mapCache.handlers('[Navigation] ✅ Found item by coordinate ID:', {
        coordId: existingItem.metadata.coordId,
        dbId: existingItem.metadata.dbId,
        name: existingItem.data.name
      });
    }
  } else {
    loggers.mapCache.handlers('[Navigation] 🏷️ Identifier appears to be a database ID');
    existingItem = allItems.find(item => String(item.metadata.dbId) === itemIdentifier);
    resolvedCoordId = existingItem?.metadata.coordId;

    if (existingItem) {
      loggers.mapCache.handlers('[Navigation] ✅ Found item by database ID:', {
        dbId: existingItem.metadata.dbId,
        coordId: existingItem.metadata.coordId,
        name: existingItem.data.name
      });
    }
  }

  if (!existingItem) {
    loggers.mapCache.handlers(`❌ No item found with identifier: ${itemIdentifier}`, {
      availableItems: allItems.map((item, index) => ({
        index: index + 1,
        dbId: item.metadata.dbId,
        dbIdType: typeof item.metadata.dbId,
        coordId: item.metadata.coordId,
        name: item.data.name
      })),
      lookingForId: itemIdentifier,
      lookingForIdType: typeof itemIdentifier
    });
  }

  return { existingItem, resolvedCoordId };
}

async function _loadItemFromServer(
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

function _updateExpandedItemsForNavigation(
  resolvedCoordId: string,
  currentState: CacheState,
  dispatch: React.Dispatch<CacheAction>
): string[] {
  const newCenterDepth = CoordSystem.getDepthFromId(resolvedCoordId);
  const newCenterItem = currentState.itemsById[resolvedCoordId];
  const newCenterDbId = newCenterItem?.metadata.dbId;

  // Build a map of dbId -> coordId for all items
  const dbIdToCoordId: Record<string, string> = {};
  Object.values(currentState.itemsById).forEach(item => {
    dbIdToCoordId[item.metadata.dbId] = item.metadata.coordId;
  });

  // Filter expanded items to keep only those within 1 generation
  const filteredExpandedDbIds = currentState.expandedItemIds.filter(expandedDbId => {
    const expandedCoordId = dbIdToCoordId[expandedDbId];
    if (!expandedCoordId) return true;

    if (newCenterDbId && expandedDbId === newCenterDbId) return true;

    const isDescendant = CoordSystem.isDescendant(expandedCoordId, resolvedCoordId);
    if (isDescendant) {
      const expandedDepth = CoordSystem.getDepthFromId(expandedCoordId);
      const generationDistance = expandedDepth - newCenterDepth;
      return generationDistance <= 1;
    }

    const isAncestor = CoordSystem.isAncestor(expandedCoordId, resolvedCoordId);
    if (isAncestor) return true;

    return false;
  });

  // Update expanded items if there are changes
  if (filteredExpandedDbIds.length !== currentState.expandedItemIds.length ||
      filteredExpandedDbIds.some((id, idx) => id !== currentState.expandedItemIds[idx])) {
    dispatch(cacheActions.setExpandedItems(filteredExpandedDbIds));
  }

  return filteredExpandedDbIds;
}

async function _handleNavigationWithoutItem(
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

async function _handleURLUpdate(
  existingItem: TileData | undefined,
  resolvedCoordId: string,
  filteredExpandedDbIds: string[],
  options: NavigationOptions,
  dataHandler: DataOperations,
  getState: () => CacheState
): Promise<{ urlUpdated: boolean; itemToNavigate: TileData | undefined }> {
  let itemToNavigate = existingItem;
  let urlUpdated = false;

  if (existingItem) {
    const newUrl = buildMapUrl(existingItem.metadata.dbId, filteredExpandedDbIds);

    if (typeof window !== 'undefined') {
      if (options.pushToHistory ?? true) {
        window.history.pushState({}, '', newUrl);
      } else {
        window.history.replaceState({}, '', newUrl);
      }
      urlUpdated = true;
    }
  } else {
    try {
      await dataHandler.loadRegion(resolvedCoordId, 0);
      const loadedItem = getState().itemsById[resolvedCoordId];
      if (loadedItem) {
        itemToNavigate = loadedItem;
      }

      if (itemToNavigate && typeof window !== 'undefined') {
        const newUrl = buildMapUrl(itemToNavigate.metadata.dbId, filteredExpandedDbIds);

        if (options.pushToHistory ?? true) {
          window.history.pushState({}, '', newUrl);
        } else {
          window.history.replaceState({}, '', newUrl);
        }
        urlUpdated = true;
      }
    } catch (error) {
      console.error('[NAV] Failed to load item for URL update:', error);
    }
  }

  return { urlUpdated, itemToNavigate };
}

function _performBackgroundTasks(
  finalCoordId: string,
  getState: () => CacheState,
  dataHandler: DataOperations,
  serverService: ServerService | undefined,
  dispatch: React.Dispatch<CacheAction>
): void {
  // Prefetch region data if needed
  if (!getState().regionMetadata[finalCoordId]) {
    dataHandler.prefetchRegion(finalCoordId).catch(error => {
      console.error('[NAV] Background region load failed:', error);
    });
  }

  // Load ancestors if needed
  const centerItem = getState().itemsById[finalCoordId];
  if (centerItem && centerItem.metadata.coordinates.path.length > 0) {
    const { hasAllAncestors } = checkAncestors(finalCoordId, getState().itemsById);

    if (!hasAllAncestors && centerItem.metadata.dbId && serverService) {
      const centerDbId = parseInt(String(centerItem.metadata.dbId));
      if (!isNaN(centerDbId)) {
        void loadAncestorsForItem(centerDbId, serverService, dispatch, "Navigation");
      }
    }
  }
}

export function createNavigationHandler(config: NavigationHandlerConfig) {
  const { dispatch, getState, dataHandler, eventBus } = config;

  const navigateToItem = async (
    itemIdentifier: string,
    options: NavigationOptions = {},
  ): Promise<NavigationResult> => {
    loggers.mapCache.handlers('[NavigationHandler.navigateToItem] Called with:', {
      itemIdentifier,
      options,
      timestamp: new Date().toISOString(),
      stackTrace: new Error().stack
    });

    try {
      loggers.mapCache.handlers('[Navigation] 🎯 Starting navigation to identifier:', { itemIdentifier });

      // 1. Resolve item identifier
      const { existingItem, resolvedCoordId } = _resolveItemIdentifier(itemIdentifier, getState);

      // 2. Try to load from server if not found
      let finalItem = existingItem;
      let finalCoordId = resolvedCoordId;

      if (!existingItem && config.serverService) {
        loggers.mapCache.handlers('[Navigation] 🔄 Item not in cache, attempting to load from server...');

        try {
          const { loadedItem, loadedCoordId } = await _loadItemFromServer(itemIdentifier, config.serverService, dispatch);
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
        return await _handleNavigationWithoutItem(itemIdentifier, finalCoordId, getState, dispatch, eventBus);
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
      const filteredExpandedDbIds = _updateExpandedItemsForNavigation(finalCoordId, currentState, dispatch);

      // 7. Update center
      const previousCenter = currentState.currentCenter;
      dispatch(cacheActions.setCenter(finalCoordId));

      // 8. Handle URL update
      const { urlUpdated } = await _handleURLUpdate(finalItem, finalCoordId, filteredExpandedDbIds, options, dataHandler, getState);

      // 9. Emit navigation event
      if (finalCoordId) {
        emitNavigationEvent(previousCenter, finalCoordId);
      }

      // 10. Background tasks
      _performBackgroundTasks(finalCoordId, getState, dataHandler, config.serverService, dispatch);

      return { success: true, centerUpdated: true, urlUpdated };
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      dispatch(cacheActions.setError(errorObj));
      return { success: false, error: errorObj, centerUpdated: false, urlUpdated: false };
    }
  };

  const emitNavigationEvent = (fromCenter: string | null, toCoordId: string): void => {
    if (!eventBus || fromCenter === toCoordId) return;
    
    const targetItem = getState().itemsById[toCoordId];
    const tileName = targetItem?.data.name ?? 'Untitled';
    
    loggers.mapCache.handlers(`📡 Emitting navigation event`, {
      fromCenter,
      toCoordId,
      targetItemExists: !!targetItem,
      tileName,
      tileDbId: targetItem?.metadata.dbId,
      allItemKeys: Object.keys(getState().itemsById),
    });
    
    eventBus.emit({
      type: 'map.navigation',
      source: 'map_cache',
      payload: {
        fromCenterId: fromCenter ?? '',
        toCenterId: targetItem?.metadata.dbId ?? '',
        toCenterName: tileName
      }
    });
  };

  const updateCenter = (centerCoordId: string): void => {
    loggers.mapCache.handlers('[NavigationHandler.updateCenter] Called with:', {
      centerCoordId,
      timestamp: new Date().toISOString(),
      stackTrace: new Error().stack
    });
    dispatch(cacheActions.setCenter(centerCoordId));
  };

  const updateURL = (centerItemId: string, expandedItems: string[]): void => {
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
  };

  const prefetchForNavigation = async (itemCoordId: string): Promise<void> => {
    loggers.mapCache.handlers('[NavigationHandler.prefetchForNavigation] Called with:', {
      itemCoordId,
      timestamp: new Date().toISOString(),
      stackTrace: new Error().stack
    });
    // Prefetch without affecting current state
    await dataHandler.prefetchRegion(itemCoordId);
  };

  const syncURLWithState = (): void => {
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
  };

  const navigateWithoutURL = async (
    itemCoordId: string,
  ): Promise<NavigationResult> => {
    loggers.mapCache.handlers('[NavigationHandler.navigateWithoutURL] Called with:', {
      itemCoordId,
      timestamp: new Date().toISOString(),
      stackTrace: new Error().stack
    });
    try {
      // Load region if needed
      await dataHandler.loadRegion(itemCoordId, getState().cacheConfig.maxDepth);

      // Update only cache center, not URL
      dispatch(cacheActions.setCenter(itemCoordId));

      return {
        success: true,
        centerUpdated: true,
        urlUpdated: false,
      };
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      dispatch(cacheActions.setError(errorObj));

      return {
        success: false,
        error: errorObj,
        centerUpdated: false,
        urlUpdated: false,
      };
    }
  };

  const getMapContext = () => {
    loggers.mapCache.handlers('[NavigationHandler.getMapContext] Called:', {
      timestamp: new Date().toISOString(),
      stackTrace: new Error().stack
    });
    const currentPathname = config.pathname
      ?? (typeof window !== 'undefined' ? window.location.pathname : '');
    const currentSearchParams = config.searchParams
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
  };

  const toggleItemExpansionWithURL = (itemId: string): void => {
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
  };

  return {
    navigateToItem,
    updateCenter,
    updateURL,
    prefetchForNavigation,
    syncURLWithState,
    navigateWithoutURL,
    getMapContext,
    toggleItemExpansionWithURL,
  } as NavigationOperations;
}

// Helper function to build map URLs
function buildMapUrl(centerItemId: string, expandedItems: string[]): string {
  // Handle test environments where window.location.origin might be undefined
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "http://localhost:3000";

  const url = new URL("/map", origin);
  
  // Center is now a query param
  url.searchParams.set("center", centerItemId);

  if (expandedItems.length > 0) {
    url.searchParams.set("expandedItems", expandedItems.join(","));
  }

  return url.pathname + url.search;
}

// Hook-based factory for use in React components
export function useNavigationHandler(
  dispatch: React.Dispatch<CacheAction>,
  getState: () => CacheState,
  dataHandler: DataOperations,
  serverService?: ServerService,
  eventBus?: EventBusService,
) {
  // Always call hooks unconditionally
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  return createNavigationHandler({
    dispatch,
    getState,
    dataHandler,
    serverService,
    router,
    searchParams,
    pathname,
    eventBus,
  });
}

// Factory function for testing with mocked dependencies
export function createNavigationHandlerForTesting(
  dispatch: React.Dispatch<CacheAction>,
  getState: () => CacheState,
  dataHandler: DataOperations,
  mockRouter?: { push: (url: string) => void; replace: (url: string) => void },
  mockSearchParams?: URLSearchParams,
  mockPathname?: string,
) {
  return createNavigationHandler({
    dispatch,
    getState,
    dataHandler,
    router: mockRouter,
    searchParams: mockSearchParams,
    pathname: mockPathname,
  });
}
