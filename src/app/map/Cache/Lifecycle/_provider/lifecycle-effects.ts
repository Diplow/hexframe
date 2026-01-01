"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Dispatch } from "react";
import type { CacheState, CacheAction } from "~/app/map/Cache/State";
import { invalidateAll, setAuthTransitioning } from "~/app/map/Cache/State";
import type { DataOperations } from "~/app/map/Cache/types/handlers";
import type { SyncOperations } from "~/app/map/Cache/Sync/types";
import type { ServerService } from "~/app/map/Cache/Services";
import type { EventBusService } from "~/app/map/types/events";
import { executePrefetchRegion } from "~/app/map/Cache/Lifecycle/_provider/_internals/prefetch-operations";
import { shouldTriggerPrefetch, createDeferredPrefetch } from "~/app/map/Cache/Lifecycle/_provider/_internals/center-change-handler";
import { useTileMutationEffect } from "~/app/map/Cache/Lifecycle/_provider/_internals/tile-mutation-handler";
import { clearPreFetchedData } from "~/app/map/Services/PreFetch/pre-fetch-service";
import { api } from "~/commons/trpc/react";

// Delay to allow auth cookies to be fully cleared/set before refetching
const AUTH_TRANSITION_DELAY_MS = 100;

export interface LifecycleHookConfig {
  dispatch: Dispatch<CacheAction>;
  state: CacheState;
  dataOperations: DataOperations;
  syncOperations: SyncOperations;
  serverService: ServerService;
  disableSync?: boolean;
  eventBus?: EventBusService;
}

/**
 * Hook that manages the provider lifecycle including initialization,
 * effects management, and cleanup. Coordinates sync operations
 * and manages the timing of data loads.
 */
export function useCacheLifecycle(config: LifecycleHookConfig): void {
  // Sync is disabled for now - will be re-enabled once basic cache works
  // TODO: Re-enable sync operations when ready

  // Track loading centers to prevent concurrent loads
  const loadingCentersRef = useRef(new Set<string>());

  // Use refs to store current config to avoid any dependency issues
  const configRef = useRef(config);
  configRef.current = config;

  // Create prefetch function with useCallback to avoid dependency issues
  const prefetchRegion = useCallback(async (centerCoordId: string, maxDepth: number) => {
    const currentConfig = configRef.current;
    await executePrefetchRegion(
      centerCoordId,
      maxDepth,
      currentConfig.dispatch,
      currentConfig.serverService,
      loadingCentersRef.current
    );
  }, []); // Empty dependencies since we use configRef

  // Handle center changes and trigger region loads
  useCenterChangeEffect(config, loadingCentersRef.current, prefetchRegion);

  // Clear cache on auth state changes
  useAuthStateEffect(config.eventBus, config.dispatch);

  // Update cache on tile mutations from external sources (like agent execution)
  useTileMutationEffect(config.eventBus, config.dispatch, config.serverService);
}

/**
 * Effect to clear cache when auth state changes (login or logout).
 * - On logout: removes private tiles from memory
 * - On login: triggers refetch to include user's private tiles
 *
 * Uses auth transitioning flag to prevent race conditions where
 * refetch happens before cookies are fully cleared/set.
 */
function useAuthStateEffect(
  eventBus: EventBusService | undefined,
  dispatch: Dispatch<CacheAction>
): void {
  const trpcUtils = api.useUtils();

  useEffect(() => {
    if (!eventBus) {
      return;
    }

    const handleAuthChange = () => {
      // 1. Block auto-refetch during transition
      dispatch(setAuthTransitioning(true));

      // 2. Clear all cached data (React state + sessionStorage + tRPC query cache)
      clearPreFetchedData();
      dispatch(invalidateAll());
      // Invalidate tRPC query cache so fresh requests go to server
      void trpcUtils.map.invalidate();

      // 3. Allow refetch after delay (cookies should be cleared/set by then)
      setTimeout(() => {
        dispatch(setAuthTransitioning(false));
      }, AUTH_TRANSITION_DELAY_MS);
    };

    const unsubscribeLogout = eventBus.on('auth.logout', handleAuthChange);
    const unsubscribeLogin = eventBus.on('auth.login', handleAuthChange);

    return () => {
      unsubscribeLogout();
      unsubscribeLogin();
    };
  }, [eventBus, dispatch, trpcUtils]);
}

/**
 * Effect to handle center changes and trigger region loads
 */
function useCenterChangeEffect(
  config: LifecycleHookConfig,
  loadingCenters: Set<string>,
  prefetchRegion: (center: string, depth: number) => Promise<void>
): void {
  useEffect(() => {
    const { cacheConfig } = config.state;

    const { shouldPrefetch, centerToLoad } = shouldTriggerPrefetch(
      config.state,
      loadingCenters
    );

    if (!shouldPrefetch || !centerToLoad) {
      return;
    }

    // Create deferred prefetch to break dispatch cascade
    return createDeferredPrefetch(
      centerToLoad,
      cacheConfig.maxDepth,
      prefetchRegion
    );
  }, [
    config.state,
    prefetchRegion,
    loadingCenters,
  ]);
}