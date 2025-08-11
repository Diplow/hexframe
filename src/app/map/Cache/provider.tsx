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
  testingOverrides = {},
  eventBus,
}: MapCacheProviderProps) {
  
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
        isLoading: false,
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
      isLoading: false,
    };
  }, [initialItems, initialCenter, initialExpandedItems, cacheConfig]);

  // Core state management
  const [state, dispatch] = useReducer(cacheReducer, initialState);

  // Initialize services
  const serverService = useServerService(serverConfig);
  const storageService = useStorageService(storageConfig);
  
  // Initialize operations
  const dataOperations = useDataOperationsWrapper(dispatch, state, serverService);
  
  const mutationOperations = useMutationOperations({
    dispatch,
    state,
    dataOperations,
    storageService,
    mapContext,
    eventBus,
  });

  // Create getState function for handlers
  const stateRef = useRef(state);
  stateRef.current = state;
  const getState = useCallback(() => stateRef.current, []);

  const navigationOperations = useNavigationHandler(
    dispatch,
    getState,
    dataOperations,
    serverService,
    eventBus,
  );

  const syncOperations = useSyncEngine(dispatch, state, dataOperations, {
    enabled: !testingOverrides.disableSync,
    intervalMs: state.cacheConfig.backgroundRefreshInterval,
  });

  // Setup lifecycle management
  useCacheLifecycle({
    dispatch,
    state,
    dataOperations,
    syncOperations,
    serverService,
    disableSync: testingOverrides.disableSync ?? false,
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
      <div data-map-cache-provider="true" className="w-full h-full">
        {children}
      </div>
    </MapCacheContext.Provider>
  );
}