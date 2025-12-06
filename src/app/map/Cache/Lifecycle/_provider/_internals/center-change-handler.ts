import type { CacheState } from "~/app/map/Cache/State";

/**
 * Determine if a prefetch should be triggered for the current center
 */
export function shouldTriggerPrefetch(
  state: CacheState,
  loadingCenters: Set<string>
): { shouldPrefetch: boolean; centerToLoad?: string } {
  const { currentCenter, itemsById, isLoading, isAuthTransitioning } = state;

  if (!currentCenter) {
    return { shouldPrefetch: false };
  }

  // Block prefetch during auth transitions to prevent race conditions
  // where server still sees old auth cookies
  if (isAuthTransitioning) {
    return { shouldPrefetch: false };
  }

  // SAFETY NET: Validate that currentCenter is in coordinate format (contains comma)
  // This prevents trying to fetch with database IDs that haven't been resolved yet
  if (!currentCenter.includes(',')) {
    return { shouldPrefetch: false };
  }

  // Simple check: do we have data or are we loading?
  const hasItem = itemsById[currentCenter];

  // If the item already exists in cache, no need to load (even without region metadata)
  if (hasItem || isLoading || loadingCenters.has(currentCenter)) {
    // Data already loaded, loading globally, or loading this specific center
    return { shouldPrefetch: false };
  }

  return {
    shouldPrefetch: true,
    centerToLoad: currentCenter
  };
}

/**
 * Create a deferred prefetch operation to break dispatch cascade
 */
export function createDeferredPrefetch(
  centerCoordId: string,
  maxDepth: number,
  prefetchFunction: (center: string, depth: number) => Promise<void>
): () => void {
  // Defer prefetch to break the dispatch cascade - use setTimeout to escape current render cycle
  const timeoutId = setTimeout(() => {
    void prefetchFunction(centerCoordId, maxDepth);
  }, 0);
  
  return () => {
    clearTimeout(timeoutId);
  };
}