import { useEffect, useRef, useCallback } from "react";
import type { Dispatch } from "react";
import type { CacheState, CacheAction } from "~/app/map/Cache/State";
import type { DataOperations } from "~/app/map/Cache/types/handlers";
import type { SyncOperations } from "~/app/map/Cache/Sync/types";
import type { ServerService } from "~/app/map/Cache/Services";
import { executePrefetchRegion } from "~/app/map/Cache/_lifecycle/_internals/prefetch-operations";
import { shouldTriggerPrefetch, createDeferredPrefetch } from "~/app/map/Cache/_lifecycle/_internals/center-change-handler";

export interface LifecycleHookConfig {
  dispatch: Dispatch<CacheAction>;
  state: CacheState;
  dataOperations: DataOperations;
  syncOperations: SyncOperations;
  serverService: ServerService;
  disableSync?: boolean;
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