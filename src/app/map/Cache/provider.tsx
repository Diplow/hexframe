"use client";

import React, {
  createContext,
  useReducer,
  useMemo,
} from "react";

// Core infrastructure
import { cacheReducer } from "~/app/map/Cache/State";

// Services
import { useServerService } from "~/app/map/Cache/Services";
import { createStorageService, createBrowserStorageOperations } from "~/app/map/Cache/Services";

// Handlers
import { useNavigationHandler } from "~/app/map/Cache/Handlers";

// Sync engine
import { useSyncEngine } from "~/app/map/Cache/Sync/sync-engine";

// Coordinators and lifecycle
import {
  useDataOperationsWrapper,
  useMutationOperations,
  useCacheContextBuilder,
  useCacheLifecycle,
  useInitialCacheState,
  useInitialCenterSetup,
  useDragServiceSetup,
  useGetStateFunction,
} from "~/app/map/Cache/Lifecycle";

// Types
import type { MapCacheContextValue, MapCacheProviderProps } from "~/app/map/Cache/types";

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
  initialCompositionExpanded = false,
  mapContext,
  cacheConfig = {},
  serverConfig = {},
  storageConfig = {},
  testingOverrides = {},
  eventBus,
}: MapCacheProviderProps) {
  // Initialize state
  const initialState = useInitialCacheState({
    initialItems,
    initialCenter,
    initialExpandedItems,
    initialCompositionExpanded,
    cacheConfig,
  });

  // Core state management
  const [state, dispatch] = useReducer(cacheReducer, initialState);

  // Update center when initialCenter changes after mount
  useInitialCenterSetup(initialCenter, state.currentCenter, dispatch);

  // Initialize services
  const serverService = useServerService(serverConfig);
  const storageService = useMemo(
    () => createStorageService(createBrowserStorageOperations(), storageConfig),
    [storageConfig]
  );
  
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

  // Create stable getState function for handlers
  const getState = useGetStateFunction(state);

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

  // Initialize global drag service
  useDragServiceSetup(
    mapContext?.userId,
    state.itemsById,
    mutationOperations.moveItem,
    mutationOperations.copyItem
  );

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