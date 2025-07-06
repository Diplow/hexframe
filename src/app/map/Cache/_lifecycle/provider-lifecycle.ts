import { useEffect } from "react";
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

  // Handle center changes and trigger region loads
  useEffect(() => {
    const { currentCenter, regionMetadata, itemsById, cacheConfig, isLoading } = config.state;
    
    // Center effect triggered
    
    if (!currentCenter) return;
    
    // Simple check: do we have data or are we loading?
    const hasRegion = regionMetadata[currentCenter];
    const hasItem = itemsById[currentCenter];
    
    if ((hasItem && hasRegion) || isLoading) {
      // Data already loaded or loading, skipping fetch
      return;
    }
    
    // Loading region for center
      
    // Create the prefetch operation inline
    const prefetchRegion = async () => {
      try {
        // Set loading state before fetching
        config.dispatch(cacheActions.setLoading(true));
          const items = await config.serverService.fetchItemsForCoordinate({
            centerCoordId: currentCenter,
            maxDepth: cacheConfig.maxDepth,
          });

        // Items fetched successfully

        config.dispatch(
          cacheActions.loadRegion(
            items as Parameters<typeof cacheActions.loadRegion>[0],
            currentCenter,
            cacheConfig.maxDepth,
          ),
        );
        
        // Clear loading state after successful load
        config.dispatch(cacheActions.setLoading(false));
        
        // Check if ancestors need to be loaded for the center item
        const centerItem = items.find(item => item.coordinates === currentCenter);
        if (centerItem?.coordinates?.includes(':')) {
          // This is a sub-tile, check if we need to load ancestors
          const { hasAllAncestors } = checkAncestors(currentCenter, items);
          
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
      }
    };
    
    void prefetchRegion();
  }, [
    config,
    config.state.currentCenter,
    config.state.cacheConfig.maxDepth,
    config.state.isLoading,
    config.serverService,
    config.dispatch,
  ]);
}