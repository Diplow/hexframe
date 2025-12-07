import type { MapItemAPIContract } from "~/server/api";
import type { CacheAction, UpdateCacheConfigPayload } from "~/app/map/Cache/State/types";
import { ACTION_TYPES } from "~/app/map/Cache/State/types";

// ============================================================================
// SYSTEM ACTION CREATORS - Loading, errors, and cache management
// ============================================================================

export const setLoading = (loading: boolean): CacheAction => ({
  type: ACTION_TYPES.SET_LOADING,
  payload: loading,
});

export const setError = (error: Error | null): CacheAction => ({
  type: ACTION_TYPES.SET_ERROR,
  payload: error,
});

export const invalidateRegion = (regionKey: string): CacheAction => ({
  type: ACTION_TYPES.INVALIDATE_REGION,
  payload: regionKey,
});

export const invalidateAll = (): CacheAction => ({
  type: ACTION_TYPES.INVALIDATE_ALL,
});

export const setAuthTransitioning = (transitioning: boolean): CacheAction => ({
  type: ACTION_TYPES.SET_AUTH_TRANSITIONING,
  payload: transitioning,
});

export const updateCacheConfig = (
  config: UpdateCacheConfigPayload,
): CacheAction => ({
  type: ACTION_TYPES.UPDATE_CACHE_CONFIG,
  payload: config,
});

// ============================================================================
// HELPER ACTION CREATORS - combine multiple actions
// ============================================================================

export const createOptimisticUpdateActions = (
  centerCoordId: string,
  item: MapItemAPIContract,
): CacheAction[] => {
  // Inline the loadRegion action to avoid circular dependency
  return [
    {
      type: ACTION_TYPES.LOAD_REGION,
      payload: {
        items: [item],
        centerCoordId,
        maxDepth: 1,
      },
    },
    setLoading(false),
  ];
};

export const createErrorHandlingActions = (error: Error): CacheAction[] => {
  return [
    setError(error),
    setLoading(false),
  ];
};

export const createBatchActions = (...actions: (CacheAction | null | undefined)[]): CacheAction[] => {
  return actions.filter((action): action is CacheAction => action != null);
};
