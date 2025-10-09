import type { Dispatch } from "react";
import type { CacheAction, CacheState } from "~/app/map/Cache/State";
import { cacheActions } from "~/app/map/Cache/State";
import type { DataOperations } from "~/app/map/Cache/types/handlers";
import type { ServerService } from "~/app/map/Cache/Services";
import { CoordSystem } from "~/lib/domains/mapping/utils";
import { checkAncestors, loadAncestorsForItem } from "~/app/map/Cache/Handlers/ancestor-loader";
import type { TileData } from "~/app/map/types";
import { buildMapUrl } from "~/app/map/Cache/Handlers/NavigationHandler/_core/navigation-core";
import type { NavigationOptions } from "~/app/map/Cache/Handlers/NavigationHandler/_core/navigation-core";
import { shouldKeepExpandedItem } from "~/app/map/Cache/Handlers/NavigationHandler/_helpers/_loading/expansion-filter";
import { loadSiblingsForItem } from "~/app/map/Cache/Handlers/NavigationHandler/navigation-resolution";

/**
 * Update expanded items to keep only those within 1 generation of new center
 */
export function updateExpandedItemsForNavigation(
  resolvedCoordId: string,
  currentState: CacheState,
  dispatch: Dispatch<CacheAction>
): string[] {
  const newCenterDepth = CoordSystem.getDepthFromId(resolvedCoordId);
  const newCenterItem = currentState.itemsById[resolvedCoordId];
  const newCenterDbId = newCenterItem?.metadata.dbId;

  const dbIdToCoordId: Record<string, string> = {};
  Object.values(currentState.itemsById).forEach(item => {
    dbIdToCoordId[item.metadata.dbId] = item.metadata.coordId;
  });

  const filteredExpandedDbIds = currentState.expandedItemIds.filter(expandedDbId =>
    shouldKeepExpandedItem(
      expandedDbId,
      dbIdToCoordId[expandedDbId],
      resolvedCoordId,
      newCenterDbId,
      newCenterDepth
    )
  );

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
  dispatch: Dispatch<CacheAction>
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

    // Load ancestors if missing
    if (!hasAllAncestors && centerItem.metadata.dbId && serverService) {
      const centerDbId = parseInt(String(centerItem.metadata.dbId));
      if (!isNaN(centerDbId)) {
        void loadAncestorsForItem(centerDbId, serverService, dispatch, "Navigation");
      }
    }

    // Load siblings if the item has a parent and server service is available
    if (centerItem.metadata.dbId && serverService) {
      const parentCoordId = CoordSystem.getParentCoordFromId(finalCoordId);

      if (parentCoordId) {
        // Check if we already have siblings loaded
        const siblings = CoordSystem.getSiblingsFromId(finalCoordId);
        const currentItems = getState().itemsById;
        const hasSiblings = siblings.some(siblingCoordId => currentItems[siblingCoordId]);

        // Only load siblings if we don't have any yet
        if (!hasSiblings) {
          void loadSiblingsForItem(parentCoordId, serverService, dispatch);
        }
      }
    }
  }
}
