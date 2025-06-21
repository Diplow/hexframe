import React, {
  createContext,
  useReducer,
  useMemo,
  useRef,
  useCallback,
} from "react";

// Core infrastructure
import { cacheReducer, initialCacheState } from "./State/reducer";

// Services
import { useServerService } from "./Services/server-service";
import { useStorageService } from "./Services/storage-service";

// Handlers
import { useNavigationHandler } from "./Handlers/navigation-handler";

// Sync engine
import { useSyncEngine } from "./Sync/sync-engine";

// Coordinators and lifecycle
import { useDataOperationsWrapper } from "./_coordinators/data-operations-wrapper";
import { useMutationOperations } from "./_coordinators/use-mutation-operations";
import { useCacheContextBuilder } from "./_builders/context-builder";
import { useCacheLifecycle } from "./_lifecycle/provider-lifecycle";

// Hooks
import { useOfflineMode } from "./_hooks/use-offline-mode";

// Types
import type { MapCacheContextValue, MapCacheProviderProps } from "./types";

// Create the context
export const MapCacheContext = createContext<MapCacheContextValue | null>(null);

/**
 * Map Cache Provider - Orchestrates all cache operations
 */
export function MapCacheProvider({
  children,
  initialItems = {},
  initialCenter = null,
  initialExpandedItems = [],
  mapContext,
  cacheConfig = {},
  serverConfig = {},
  storageConfig = {},
  offlineMode = false,
  testingOverrides = {},
}: MapCacheProviderProps) {
  const isOffline = offlineMode || (typeof window !== "undefined" && !navigator.onLine);
  
  // Provider mounting/re-rendering

  // Initialize state
  const hasInitializedRef = useRef(false);
  const initialState = useMemo(() => {
    if (hasInitializedRef.current && Object.keys(initialItems).length === 0) {
      // Detected possible remount with empty items
      return {
        ...initialCacheState,
        currentCenter: initialCenter,
        expandedItemIds: initialExpandedItems,
        lastUpdated: Date.now(),
        cacheConfig: { ...initialCacheState.cacheConfig, ...cacheConfig },
        // Start with loading true if we're in offline mode and have no initial items
        isLoading: isOffline && Object.keys(initialItems).length === 0,
      };
    }
    
    hasInitializedRef.current = true;
    return {
      ...initialCacheState,
      itemsById: initialItems,
      currentCenter: initialCenter,
      expandedItemIds: initialExpandedItems,
      lastUpdated: Date.now(),
      cacheConfig: { ...initialCacheState.cacheConfig, ...cacheConfig },
      // Start with loading true if we're in offline mode and have no initial items
      isLoading: isOffline && Object.keys(initialItems).length === 0,
    };
  }, [initialItems, initialCenter, initialExpandedItems, cacheConfig, isOffline]);

  // Core state management
  const [state, dispatch] = useReducer(cacheReducer, initialState);

  // Initialize services
  const serverService = useServerService(serverConfig);
  const storageService = useStorageService(storageConfig);
  
  // Remove duplicate localStorage loading - useOfflineMode handles this

  // Initialize operations
  // Pass a wrapped serverService that returns empty results when offline
  const wrappedServerService = useMemo(() => {
    // Creating wrapped server service
    
    if (!isOffline) return serverService;
    
    // Return a no-op server service for offline mode
    return {
      fetchItemsForCoordinate: async () => {
        // Server call blocked - using cached data only
        return [];
      },
      getItemByCoordinate: async () => {
        // Server call blocked - using cached data only
        return null;
      },
      getRootItemById: async () => {
        // Server call blocked - using cached data only
        return null;
      },
      getDescendants: async () => {
        // Server call blocked - using cached data only
        return [];
      },
      createItem: async () => {
        throw new Error('Mutations not available in offline mode');
      },
      updateItem: async () => {
        throw new Error('Mutations not available in offline mode');
      },
      deleteItem: async () => {
        throw new Error('Mutations not available in offline mode');
      },
      getAncestors: async () => {
        return [];
      },
    };
  }, [serverService, isOffline]);
  
  const dataOperations = useDataOperationsWrapper(dispatch, state, wrappedServerService);
  
  const mutationOperations = useMutationOperations({
    dispatch,
    state,
    dataOperations,
    storageService,
    mapContext,
  });

  // Create getState function for handlers
  const stateRef = useRef(state);
  stateRef.current = state;
  const getState = useCallback(() => stateRef.current, []);

  const navigationOperations = useNavigationHandler(
    dispatch,
    getState,
    dataOperations,
  );

  const syncOperations = useSyncEngine(dispatch, state, dataOperations, {
    enabled: !testingOverrides.disableSync && !isOffline,
    intervalMs: state.cacheConfig.backgroundRefreshInterval,
  });

  // Setup offline mode - always sync with localStorage
  useOfflineMode({
    enabled: isOffline,
    dispatch,
    state,
    storageService,
    syncEnabled: true, // Always sync to localStorage for seamless offline transition
    onInitialLoad: (_data) => {
      // Loaded data from localStorage
    },
  });

  // Setup lifecycle management
  useCacheLifecycle({
    dispatch,
    state,
    dataOperations,
    syncOperations,
    serverService,
    disableSync: testingOverrides.disableSync ?? isOffline,
  });

  // Build context value
  const contextValue = useCacheContextBuilder({
    state,
    dispatch,
    dataOperations,
    mutationOperations,
    navigationOperations,
    syncOperations,
    serverService,
    storageService,
  });

  return (
    <MapCacheContext.Provider value={contextValue}>
      <div data-map-cache-provider="true">
        {children}
      </div>
    </MapCacheContext.Provider>
  );
}