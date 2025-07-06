import { useEffect, useCallback, useRef } from "react";
import type { Dispatch } from "react";
import type { CacheState, CacheAction } from "../State/types";
import type { DataOperations } from "../Handlers/types";
import type { SyncOperations } from "../Sync/types";
import type { ServerService } from "../Services/types";
import { cacheActions } from "../State/actions";
import { checkAncestors, loadAncestorsForItem } from "../Handlers/ancestor-loader";

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

  // Provider lifecycle logging
  useEffect(() => {
    // Provider mounted
    return () => {
      // Provider unmounting
    };
  }, []);

  // Sync is disabled for now - will be re-enabled once basic cache works
  // TODO: Re-enable sync operations when ready

  // Track loading centers to prevent concurrent loads
  const loadingCentersRef = useRef(new Set<string>());
  
  // Create stable prefetch function
  const prefetchRegion = useCallback(async (centerCoordId: string, maxDepth: number) => {
    // Prevent concurrent loads for the same center
    if (loadingCentersRef.current.has(centerCoordId)) {
      return;
    }
    
    try {
      loadingCentersRef.current.add(centerCoordId);
      
      // Set loading state before fetching
      config.dispatch(cacheActions.setLoading(true));
      
      const items = await config.serverService.fetchItemsForCoordinate({
        centerCoordId,
        maxDepth,
      });

      // Items fetched successfully
      config.dispatch(
        cacheActions.loadRegion(
          items as Parameters<typeof cacheActions.loadRegion>[0],
          centerCoordId,
          maxDepth,
        ),
      );
      
      // Clear loading state after successful load
      config.dispatch(cacheActions.setLoading(false));
      
      // Check if ancestors need to be loaded for the center item
      const centerItem = items.find(item => item.coordinates === centerCoordId);
      if (centerItem?.coordinates?.includes(':')) {
        // This is a sub-tile, check if we need to load ancestors
        const { hasAllAncestors } = checkAncestors(centerCoordId, items);
        
        // Load ancestors if missing
        if (!hasAllAncestors && centerItem.id) {
          const centerDbId = typeof centerItem.id === 'string' ? parseInt(centerItem.id) : centerItem.id;
          if (!isNaN(centerDbId)) {
            void loadAncestorsForItem(centerDbId, config.serverService, config.dispatch, "Initial Load");
          }
        }
      }
    } catch (error) {
      console.error('[MapCache] Failed to load region:', error);
      config.dispatch(cacheActions.setError(error as Error));
      config.dispatch(cacheActions.setLoading(false));
    } finally {
      loadingCentersRef.current.delete(centerCoordId);
    }
  }, [config.serverService, config.dispatch]);

  // Handle center changes and trigger region loads
  useEffect(() => {
    const { currentCenter, regionMetadata, itemsById, cacheConfig, isLoading } = config.state;
    
    if (!currentCenter) return;
    
    // Simple check: do we have data or are we loading?
    const hasRegion = regionMetadata[currentCenter];
    const hasItem = itemsById[currentCenter];
    
    if ((hasItem && hasRegion) || isLoading || loadingCentersRef.current.has(currentCenter)) {
      // Data already loaded, loading globally, or loading this specific center
      return;
    }
    
    // Start loading region for center
    void prefetchRegion(currentCenter, cacheConfig.maxDepth);
  }, [
    config.state.currentCenter,
    config.state.cacheConfig.maxDepth,
    prefetchRegion,
  ]);
}