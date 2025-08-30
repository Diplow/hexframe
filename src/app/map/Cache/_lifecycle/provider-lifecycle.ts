import { useEffect, useRef } from "react";
import type { Dispatch } from "react";
import type { CacheState, CacheAction } from "~/app/map/Cache/State/types";
import type { DataOperations } from "~/app/map/Cache/Handlers/types";
import type { SyncOperations } from "~/app/map/Cache/Sync/types";
import type { ServerService } from "~/app/map/Cache/Services/types";
import { cacheActions } from "~/app/map/Cache/State/actions";
import { checkAncestors, loadAncestorsForItem } from "~/app/map/Cache/Handlers/ancestor-loader";

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
  
  // Create prefetch function without useCallback to avoid any dependency issues
  const prefetchRegion = async (centerCoordId: string, maxDepth: number) => {
    // Get current config from ref
    const currentConfig = configRef.current;
    
    // Prevent concurrent loads for the same center
    if (loadingCentersRef.current.has(centerCoordId)) {
      return;
    }
    
    try {
      loadingCentersRef.current.add(centerCoordId);
      
      // Set loading state before fetching
      currentConfig.dispatch(cacheActions.setLoading(true));
      
      const items = await currentConfig.serverService.fetchItemsForCoordinate({
        centerCoordId,
        maxDepth,
      });

      // Items fetched successfully
      currentConfig.dispatch(
        cacheActions.loadRegion(
          items as Parameters<typeof cacheActions.loadRegion>[0],
          centerCoordId,
          maxDepth,
        ),
      );
      
      // Clear loading state after successful load
      currentConfig.dispatch(cacheActions.setLoading(false));
      
      // Check if ancestors need to be loaded for the center item
      const centerItem = items.find(item => item.coordinates === centerCoordId);
      if (centerItem?.coordinates?.includes(':')) {
        // This is a sub-tile, check if we need to load ancestors
        const { hasAllAncestors } = checkAncestors(centerCoordId, items);
        
        // Load ancestors if missing
        if (!hasAllAncestors && centerItem.id) {
          const centerDbId = typeof centerItem.id === 'string' ? parseInt(centerItem.id) : centerItem.id;
          if (!isNaN(centerDbId)) {
            void loadAncestorsForItem(centerDbId, currentConfig.serverService, currentConfig.dispatch, "Initial Load");
          }
        }
      }
    } catch (error) {
      console.error('[MapCache] Failed to load region:', error);
      currentConfig.dispatch(cacheActions.setError(error as Error));
      currentConfig.dispatch(cacheActions.setLoading(false));
    } finally {
      loadingCentersRef.current.delete(centerCoordId);
    }
  };

  // Handle center changes and trigger region loads
  // Use a timeout to defer prefetch and break the dispatch cascade
  useEffect(() => {
    const { currentCenter, itemsById, cacheConfig, isLoading } = config.state;
    
    
    
    if (!currentCenter) return;
    
    // SAFETY NET: Validate that currentCenter is in coordinate format (contains comma)
    // This prevents trying to fetch with database IDs that haven't been resolved yet
    if (!currentCenter.includes(',')) {
      return;
    }
    
    // Simple check: do we have data or are we loading?
    const hasItem = itemsById[currentCenter];
    
    // If the item already exists in cache, no need to load (even without region metadata)
    if (hasItem || isLoading || loadingCentersRef.current.has(currentCenter)) {
      // Data already loaded, loading globally, or loading this specific center
      return;
    }
    
    
    // Defer prefetch to break the dispatch cascade - use setTimeout to escape current render cycle
    const timeoutId = setTimeout(() => {
      void prefetchRegion(currentCenter, cacheConfig.maxDepth);
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    config.state.currentCenter,
    config.state.cacheConfig.maxDepth,
    config.state.itemsById,
    config.state.isLoading,
    // Include prefetchRegion since we're calling it
    prefetchRegion,
  ]);
}