"use client";

import React, {
  createContext,
  useReducer,
  useMemo,
  useRef,
  useCallback,
  useEffect,
} from "react";

// Core infrastructure
import { cacheReducer, initialCacheState } from "~/app/map/Cache/State";

// Services
import { useServerService } from "~/app/map/Cache/Services/server/server-service";
import { createStorageService, createBrowserStorageOperations } from "~/app/map/Cache/Services/storage-service";

// Handlers
import { useNavigationHandler } from "~/app/map/Cache/Handlers";

// Sync engine
import { useSyncEngine } from "~/app/map/Cache/Sync/sync-engine";

// Coordinators and lifecycle
import { useDataOperationsWrapper } from "~/app/map/Cache/_coordinators/data-operations-wrapper";
import { useMutationOperations } from "~/app/map/Cache/_coordinators/use-mutation-operations";
import { useCacheContextBuilder } from "~/app/map/Cache/_builders/context-builder";
import { useCacheLifecycle } from "~/app/map/Cache/_lifecycle/provider-lifecycle";
import { cacheActions } from "~/app/map/Cache/State";

// Global drag service
import { globalDragService } from "~/app/map/Services";
import { validateDragOperation } from "~/app/map/Services";

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
  mapContext,
  cacheConfig = {},
  serverConfig = {},
  storageConfig = {},
  testingOverrides = {},
  eventBus,
}: MapCacheProviderProps) {
  

  // Initialize state - only memoize on serializable values
  const hasInitializedRef = useRef(false);
  const initialItemsCount = Object.keys(initialItems).length;
  const initialState = useMemo(() => {
    if (hasInitializedRef.current && initialItemsCount === 0) {
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
  }, [initialItems, initialCenter, initialExpandedItems, cacheConfig, initialItemsCount]);

  // Core state management
  const [state, dispatch] = useReducer(cacheReducer, initialState);
  
  // Update center when initialCenter changes after mount, but only if we haven't set a center yet
  const hasInitializedCenter = useRef(false);
  useEffect(() => {
    if (initialCenter && !hasInitializedCenter.current && !state.currentCenter) {
      dispatch(cacheActions.setCenter(initialCenter));
      hasInitializedCenter.current = true;
    }
  }, [initialCenter, state.currentCenter]);

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

  // Initialize global drag service
  useEffect(() => {
    if (mapContext?.userId) {
      globalDragService.initialize({
        currentUserId: mapContext.userId,
        dropHandler: async (operation) => {
          await mutationOperations.moveItem(operation.sourceId, operation.targetId);
        },
        validationHandler: (sourceId, targetId, _sourceOwned, _targetOwned) => {
          const sourceTile = state.itemsById[sourceId] ?? null;
          const targetTile = state.itemsById[targetId] ?? null;

          return validateDragOperation(
            sourceId,
            targetId,
            sourceTile,
            targetTile,
            mapContext.userId
          );
        }
      });
    }
  }, [mapContext?.userId, mutationOperations, state.itemsById]);

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