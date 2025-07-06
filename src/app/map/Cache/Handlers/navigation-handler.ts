import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { CacheAction, CacheState } from "../State/types";
import { cacheActions } from "../State/actions";
import type { DataOperations, NavigationOperations } from "./types";
import { CoordSystem } from "~/lib/domains/mapping/utils/hex-coordinates";
import type { ServerService } from "../Services/types";
import { checkAncestors, loadAncestorsForItem } from "./ancestor-loader";
import type { EventBusService } from "~/app/map/types/events";

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

export function createNavigationHandler(config: NavigationHandlerConfig) {
  const { dispatch, getState, dataHandler, eventBus } = config;

  const navigateToItem = async (
    itemCoordId: string,
    options: NavigationOptions = {},
  ): Promise<NavigationResult> => {
    const { } = options; // Options reserved for future use
    
    try {
      // 1. Check if we already have the item
      const existingItem = getState().itemsById[itemCoordId];
      
      // 2. Collapse tiles that are more than 1 generation away from the new center
      const currentState = getState();
      const newCenterDepth = CoordSystem.getDepthFromId(itemCoordId);
      
      // Get the dbId of the new center if it exists
      const newCenterItem = currentState.itemsById[itemCoordId];
      const newCenterDbId = newCenterItem?.metadata.dbId;
      
      // Build a map of dbId -> coordId for all items
      const dbIdToCoordId: Record<string, string> = {};
      Object.values(currentState.itemsById).forEach(item => {
        dbIdToCoordId[item.metadata.dbId] = item.metadata.coordId;
      });
      
      // Filter expanded items (which are dbIds) to keep only those within 1 generation
      const filteredExpandedDbIds = currentState.expandedItemIds.filter(expandedDbId => {
        // Get the coordId for this dbId
        const expandedCoordId = dbIdToCoordId[expandedDbId];
        if (!expandedCoordId) {
          // If we don't have the item data, keep it for now
          return true;
        }
        
        // Keep the new center itself if it was expanded
        if (newCenterDbId && expandedDbId === newCenterDbId) {
          return true;
        }
        
        // Check if the expanded item is a descendant of the new center
        const isDescendant = CoordSystem.isDescendant(expandedCoordId, itemCoordId);
          
        if (isDescendant) {
          // It's a descendant - check generation distance
          const expandedDepth = CoordSystem.getDepthFromId(expandedCoordId);
          const generationDistance = expandedDepth - newCenterDepth;
          const keep = generationDistance <= 1;
          return keep;
        }
        
        // Check if the new center is a descendant of the expanded item
        const isAncestor = CoordSystem.isAncestor(expandedCoordId, itemCoordId);
          
        if (isAncestor) {
          // The expanded item is an ancestor of the new center - keep ALL ancestors expanded
          return true;
        }
        
        // For items that are neither ancestors nor descendants, collapse them
        return false;
      });
      
      // Update expanded items if there are changes
      if (filteredExpandedDbIds.length !== currentState.expandedItemIds.length) {
        dispatch(cacheActions.setExpandedItems(filteredExpandedDbIds));
      }
      
      // 3. Update the cache center first (this changes the view immediately)
      const previousCenter = currentState.currentCenter;
      dispatch(cacheActions.setCenter(itemCoordId));
      
      // Note: Navigation event will be emitted after we ensure item data is loaded
      
      // 4. Handle URL update
      let itemToNavigate = existingItem;
      let urlUpdated = false;
      
      if (existingItem) {
        // We have the item, update URL immediately without triggering re-render
        const newUrl = buildMapUrl(
          existingItem.metadata.dbId,
          filteredExpandedDbIds,
        );
        
        // Use native history API to avoid React re-renders
        if (typeof window !== 'undefined') {
          if (options.pushToHistory ?? true) {
            window.history.pushState({}, '', newUrl);
          } else {
            window.history.replaceState({}, '', newUrl);
          }
          urlUpdated = true;
        }
        
        // Emit navigation event now that we have the item data
        emitNavigationEvent(previousCenter, itemCoordId);
      } else if (!existingItem) {
        // We don't have the item, try to load it for URL update
        try {
          // Load the item data in the background
          await dataHandler.loadRegion(itemCoordId, 0); // Load just the center item
          itemToNavigate = getState().itemsById[itemCoordId];
          
          if (itemToNavigate && typeof window !== 'undefined') {
            const newUrl = buildMapUrl(
              itemToNavigate.metadata.dbId,
              filteredExpandedDbIds,
            );
            
            if (options.pushToHistory ?? true) {
              window.history.pushState({}, '', newUrl);
            } else {
              window.history.replaceState({}, '', newUrl);
            }
            urlUpdated = true;
          }
        } catch (error) {
          console.error('[NAV] Failed to load item for URL update:', error);
          // Navigation succeeds but URL won't be updated
        }
        
        // Emit navigation event after attempting to load item data
        emitNavigationEvent(previousCenter, itemCoordId);
      }
      
      // 5. Load additional region data if needed (in background)
      if (!getState().regionMetadata[itemCoordId]) {
        dataHandler.prefetchRegion(itemCoordId).catch(error => {
          console.error('[NAV] Background region load failed:', error);
        });
      }
      
      // 6. Check if ancestors need to be loaded
      const centerItem = getState().itemsById[itemCoordId];
      if (centerItem && centerItem.metadata.coordinates.path.length > 0) {
        const { hasAllAncestors } = checkAncestors(itemCoordId, getState().itemsById);
        
        // Load ancestors if missing
        if (!hasAllAncestors && centerItem.metadata.dbId && config.serverService) {
          const centerDbId = parseInt(centerItem.metadata.dbId);
          if (!isNaN(centerDbId)) {
            // Load ancestors in background
            void loadAncestorsForItem(centerDbId, config.serverService, dispatch, "Navigation");
          }
        }
      }

      return {
        success: true,
        centerUpdated: true,
        urlUpdated,
      };
    } catch (error) {
      const errorObj = error as Error;
      dispatch(cacheActions.setError(errorObj));

      return {
        success: false,
        error: errorObj,
        centerUpdated: false,
        urlUpdated: false,
      };
    }
  };

  const emitNavigationEvent = (fromCenter: string | null, toCoordId: string): void => {
    if (!eventBus || fromCenter === toCoordId) return;
    
    const targetItem = getState().itemsById[toCoordId];
    const tileName = targetItem?.data.name ?? 'Untitled';
    
    console.log('[Navigation] 📡 Emitting navigation event:', {
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
    dispatch(cacheActions.setCenter(centerCoordId));
  };

  const updateURL = (centerItemId: string, expandedItems: string[]): void => {
    if (typeof window !== 'undefined') {
      const newUrl = buildMapUrl(centerItemId, expandedItems);
      window.history.pushState({}, '', newUrl);
    }
  };

  const prefetchForNavigation = async (itemCoordId: string): Promise<void> => {
    // Prefetch without affecting current state
    await dataHandler.prefetchRegion(itemCoordId);
  };

  const syncURLWithState = (): void => {
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
      const errorObj = error as Error;
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
    const currentPathname = "";
    const currentSearchParams = new URLSearchParams();

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
