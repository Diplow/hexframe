import type { ACTION_TYPES, CacheState, CacheAction } from "~/app/map/Cache/State/types";

export function handleSetLoading(
  state: CacheState,
  action: Extract<CacheAction, { type: typeof ACTION_TYPES.SET_LOADING }>,
): CacheState {
  return {
    ...state,
    isLoading: action.payload,
  };
}

export function handleSetError(
  state: CacheState,
  action: Extract<CacheAction, { type: typeof ACTION_TYPES.SET_ERROR }>,
): CacheState {
  return {
    ...state,
    error: action.payload,
  };
}

export function handleInvalidateRegion(
  state: CacheState,
  action: Extract<CacheAction, { type: typeof ACTION_TYPES.INVALIDATE_REGION }>,
): CacheState {
  const regionKey = action.payload;
  const newRegionMetadata = { ...state.regionMetadata };
  delete newRegionMetadata[regionKey];

  return {
    ...state,
    regionMetadata: newRegionMetadata,
  };
}

export function handleInvalidateAll(state: CacheState): CacheState {
  console.error("[DEBUG Reducer] INVALIDATE_ALL called! This clears all items!");
  return {
    ...state,
    itemsById: {},
    regionMetadata: {},
    lastUpdated: 0,
  };
}

export function handleUpdateCacheConfig(
  state: CacheState,
  action: Extract<CacheAction, { type: typeof ACTION_TYPES.UPDATE_CACHE_CONFIG }>,
): CacheState {
  return {
    ...state,
    cacheConfig: {
      ...state.cacheConfig,
      ...action.payload,
    },
  };
}
