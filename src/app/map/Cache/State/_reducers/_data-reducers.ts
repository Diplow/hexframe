import type { ACTION_TYPES, CacheState, CacheAction } from "~/app/map/Cache/State/types";
import type { TileData } from "~/app/map/types";
import { formatItems, createRegionKey, hasDataChanges } from "~/app/map/Cache/State/_reducers/_helpers";

export function handleLoadRegion(
  state: CacheState,
  action: Extract<CacheAction, { type: typeof ACTION_TYPES.LOAD_REGION }>,
): CacheState {
  const { items, centerCoordId, maxDepth } = action.payload;
  const newItems = formatItems(items);
  const regionKey = createRegionKey(centerCoordId);

  const updatedItems = { ...state.itemsById };
  newItems.forEach((item) => {
    updatedItems[item.metadata.coordId] = item;
  });

  const newRegionMetadata = {
    ...state.regionMetadata,
    [regionKey]: {
      centerCoordId,
      maxDepth,
      loadedAt: Date.now(),
      itemCoordIds: newItems.map((item) => item.metadata.coordId),
    },
  };

  return {
    ...state,
    itemsById: updatedItems,
    regionMetadata: newRegionMetadata,
    lastUpdated: Date.now(),
    error: null,
  };
}

export function handleLoadItemChildren(
  state: CacheState,
  action: Extract<CacheAction, { type: typeof ACTION_TYPES.LOAD_ITEM_CHILDREN }>,
): CacheState {
  const { items } = action.payload;
  const newItems = formatItems(items);

  const newItemsById = newItems.reduce(
    (acc, item) => {
      acc[item.metadata.coordId] = item;
      return acc;
    },
    {} as Record<string, TileData>,
  );

  const hasChanges = hasDataChanges(state.itemsById, newItemsById);
  if (!hasChanges) {
    return state;
  }

  const updatedItems = { ...state.itemsById };
  newItems.forEach((item) => {
    updatedItems[item.metadata.coordId] = item;
  });

  return {
    ...state,
    itemsById: updatedItems,
    lastUpdated: Date.now(),
  };
}

export function handleUpdateItems(
  state: CacheState,
  action: Extract<CacheAction, { type: typeof ACTION_TYPES.UPDATE_ITEMS }>,
): CacheState {
  const updates = action.payload;
  const newItemsById = { ...state.itemsById };
  const deletedCoordIds: string[] = [];

  Object.entries(updates).forEach(([coordId, item]) => {
    if (item === undefined) {
      delete newItemsById[coordId];
      deletedCoordIds.push(coordId);
    } else {
      newItemsById[coordId] = item;
    }
  });

  let newRegionMetadata = state.regionMetadata;
  if (deletedCoordIds.length > 0) {
    newRegionMetadata = { ...state.regionMetadata };
    Object.keys(newRegionMetadata).forEach((regionKey) => {
      const region = newRegionMetadata[regionKey];
      if (region) {
        const filteredCoordIds = region.itemCoordIds.filter(
          (id) => !deletedCoordIds.includes(id),
        );
        if (filteredCoordIds.length !== region.itemCoordIds.length) {
          newRegionMetadata[regionKey] = {
            ...region,
            itemCoordIds: filteredCoordIds,
          };
        }
      }
    });
  }

  return {
    ...state,
    itemsById: newItemsById,
    regionMetadata: newRegionMetadata,
    lastUpdated: Date.now(),
  };
}

export function handleRemoveItem(
  state: CacheState,
  action: Extract<CacheAction, { type: typeof ACTION_TYPES.REMOVE_ITEM }>,
): CacheState {
  const coordId = action.payload;
  const newItemsById = { ...state.itemsById };
  delete newItemsById[coordId];

  const newRegionMetadata = { ...state.regionMetadata };
  Object.keys(newRegionMetadata).forEach((regionKey) => {
    const region = newRegionMetadata[regionKey];
    if (region) {
      region.itemCoordIds = region.itemCoordIds.filter((id) => id !== coordId);
    }
  });

  return {
    ...state,
    itemsById: newItemsById,
    regionMetadata: newRegionMetadata,
    lastUpdated: Date.now(),
  };
}
