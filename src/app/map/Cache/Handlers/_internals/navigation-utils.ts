import type { CacheAction, CacheState } from "~/app/map/Cache/State";
import { cacheActions } from "~/app/map/Cache/State";
import type { DataOperations } from "~/app/map/Cache/types/handlers";
import type { ServerService } from "~/app/map/Cache/Services/types";
import { CoordSystem } from "~/lib/domains/mapping/utils";
import { checkAncestors, loadAncestorsForItem } from "~/app/map/Cache/Handlers/ancestor-loader";
import type { TileData } from "~/app/map/types";
import { loggers } from "~/lib/debug/debug-logger";
import { buildMapUrl } from "~/app/map/Cache/Handlers/_internals/navigation-core";
import type { NavigationOptions } from "~/app/map/Cache/Handlers/_internals/navigation-core";

/**
 * Resolve item identifier to find existing item and coordinate ID
 */
export function resolveItemIdentifier(
  itemIdentifier: string, 
  getState: () => CacheState
): { existingItem: TileData | undefined; resolvedCoordId: string | undefined } {
  const allItems = Object.values(getState().itemsById);
  let existingItem: TileData | undefined;
  let resolvedCoordId: string | undefined;

  // Check if it's a coordinate ID (contains comma or colon)
  if (itemIdentifier.includes(',') || itemIdentifier.includes(':')) {
    loggers.mapCache.handlers('[Navigation] 🗺️ Identifier appears to be a coordinate ID');
    existingItem = getState().itemsById[itemIdentifier];
    resolvedCoordId = itemIdentifier;

    if (existingItem) {
      loggers.mapCache.handlers('[Navigation] ✅ Found item by coordinate ID:', {
        coordId: existingItem.metadata.coordId,
        dbId: existingItem.metadata.dbId,
        name: existingItem.data.name
      });
    }
  } else {
    loggers.mapCache.handlers('[Navigation] 🏷️ Identifier appears to be a database ID');
    existingItem = allItems.find(item => String(item.metadata.dbId) === itemIdentifier);
    resolvedCoordId = existingItem?.metadata.coordId;

    if (existingItem) {
      loggers.mapCache.handlers('[Navigation] ✅ Found item by database ID:', {
        dbId: existingItem.metadata.dbId,
        coordId: existingItem.metadata.coordId,
        name: existingItem.data.name
      });
    }
  }

  if (!existingItem) {
    loggers.mapCache.handlers(`❌ No item found with identifier: ${itemIdentifier}`, {
      availableItems: allItems.map((item, index) => ({
        index: index + 1,
        dbId: item.metadata.dbId,
        dbIdType: typeof item.metadata.dbId,
        coordId: item.metadata.coordId,
        name: item.data.name
      })),
      lookingForId: itemIdentifier,
      lookingForIdType: typeof itemIdentifier
    });
  }

  return { existingItem, resolvedCoordId };
}

/**
 * Update expanded items to keep only those within 1 generation of new center
 */
export function updateExpandedItemsForNavigation(
  resolvedCoordId: string,
  currentState: CacheState,
  dispatch: React.Dispatch<CacheAction>
): string[] {
  const newCenterDepth = CoordSystem.getDepthFromId(resolvedCoordId);
  const newCenterItem = currentState.itemsById[resolvedCoordId];
  const newCenterDbId = newCenterItem?.metadata.dbId;

  // Build a map of dbId -> coordId for all items
  const dbIdToCoordId: Record<string, string> = {};
  Object.values(currentState.itemsById).forEach(item => {
    dbIdToCoordId[item.metadata.dbId] = item.metadata.coordId;
  });

  // Filter expanded items to keep only those within 1 generation
  const filteredExpandedDbIds = currentState.expandedItemIds.filter(expandedDbId => {
    const expandedCoordId = dbIdToCoordId[expandedDbId];
    if (!expandedCoordId) return true;

    if (newCenterDbId && expandedDbId === newCenterDbId) return true;

    const isDescendant = CoordSystem.isDescendant(expandedCoordId, resolvedCoordId);
    if (isDescendant) {
      const expandedDepth = CoordSystem.getDepthFromId(expandedCoordId);
      const generationDistance = expandedDepth - newCenterDepth;
      return generationDistance <= 1;
    }

    const isAncestor = CoordSystem.isAncestor(expandedCoordId, resolvedCoordId);
    if (isAncestor) return true;

    return false;
  });

  // Update expanded items if there are changes
  if (filteredExpandedDbIds.length !== currentState.expandedItemIds.length ||
      filteredExpandedDbIds.some((id, idx) => id !== currentState.expandedItemIds[idx])) {
    dispatch(cacheActions.setExpandedItems(filteredExpandedDbIds));
  }

  return filteredExpandedDbIds;
}

/**
 * Handle URL update during navigation
 */
export async function handleURLUpdate(
  existingItem: TileData | undefined,
  resolvedCoordId: string,
  filteredExpandedDbIds: string[],
  options: NavigationOptions,
  dataHandler: DataOperations,
  getState: () => CacheState
): Promise<{ urlUpdated: boolean; itemToNavigate: TileData | undefined }> {
  let itemToNavigate = existingItem;
  let urlUpdated = false;

  if (existingItem) {
    const newUrl = buildMapUrl(existingItem.metadata.dbId, filteredExpandedDbIds);

    if (typeof window !== 'undefined') {
      if (options.pushToHistory ?? true) {
        window.history.pushState({}, '', newUrl);
      } else {
        window.history.replaceState({}, '', newUrl);
      }
      urlUpdated = true;
    }
  } else {
    try {
      await dataHandler.loadRegion(resolvedCoordId, 0);
      const loadedItem = getState().itemsById[resolvedCoordId];
      if (loadedItem) {
        itemToNavigate = loadedItem;
      }

      if (itemToNavigate && typeof window !== 'undefined') {
        const newUrl = buildMapUrl(itemToNavigate.metadata.dbId, filteredExpandedDbIds);

        if (options.pushToHistory ?? true) {
          window.history.pushState({}, '', newUrl);
        } else {
          window.history.replaceState({}, '', newUrl);
        }
        urlUpdated = true;
      }
    } catch (error) {
      console.error('[NAV] Failed to load item for URL update:', error);
    }
  }

  return { urlUpdated, itemToNavigate };
}

/**
 * Perform background tasks after navigation
 */
export function performBackgroundTasks(
  finalCoordId: string,
  getState: () => CacheState,
  dataHandler: DataOperations,
  serverService: ServerService | undefined,
  dispatch: React.Dispatch<CacheAction>
): void {
  // Prefetch region data if needed
  if (!getState().regionMetadata[finalCoordId]) {
    dataHandler.prefetchRegion(finalCoordId).catch(error => {
      console.error('[NAV] Background region load failed:', error);
    });
  }

  // Load ancestors if needed
  const centerItem = getState().itemsById[finalCoordId];
  if (centerItem && centerItem.metadata.coordinates.path.length > 0) {
    const { hasAllAncestors } = checkAncestors(finalCoordId, getState().itemsById);

    if (!hasAllAncestors && centerItem.metadata.dbId && serverService) {
      const centerDbId = parseInt(String(centerItem.metadata.dbId));
      if (!isNaN(centerDbId)) {
        void loadAncestorsForItem(centerDbId, serverService, dispatch, "Navigation");
      }
    }
  }
}