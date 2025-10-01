import type { CacheAction, CacheState } from "~/app/map/Cache/State";
import { cacheActions } from "~/app/map/Cache/State";
import type { DataOperations } from "~/app/map/Cache/types/handlers";
import type { ServerService } from "~/app/map/Cache/Services/types";
import { CoordSystem } from "~/lib/domains/mapping/utils";
import { checkAncestors, loadAncestorsForItem } from "~/app/map/Cache/Handlers/ancestor-loader";
import type { TileData } from "~/app/map/types";
import { getColor } from "~/app/map/types";
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
        title: existingItem.data.title
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
        title: existingItem.data.title
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
        title: item.data.title
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

    // Keep the new center itself if it's expanded
    if (newCenterDbId && expandedDbId === newCenterDbId) return true;

    // Keep descendants within 1 generation
    const isDescendant = CoordSystem.isDescendant(expandedCoordId, resolvedCoordId);
    if (isDescendant) {
      const expandedDepth = CoordSystem.getDepthFromId(expandedCoordId);
      const generationDistance = expandedDepth - newCenterDepth;
      return generationDistance <= 1;
    }

    // Keep ancestors
    const isAncestor = CoordSystem.isAncestor(expandedCoordId, resolvedCoordId);
    if (isAncestor) return true;

    // Keep siblings (neighbors at the same level) to preserve expansion when navigating between neighbors
    const siblings = CoordSystem.getSiblingsFromId(resolvedCoordId);
    const isSibling = siblings.includes(expandedCoordId);
    if (isSibling) return true;

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

/**
 * Load siblings for an item by fetching its parent with 1 generation of children
 */
async function loadSiblingsForItem(
  parentCoordId: string,
  serverService: ServerService,
  dispatch: React.Dispatch<CacheAction>
): Promise<void> {
  try {
    const parentWithChildren = await serverService.getItemWithGenerations({
      coordId: parentCoordId,
      generations: 1
    });

    if (parentWithChildren.length > 0) {
      // Convert to TileData format
      const siblingItems: Record<string, TileData> = {};

      parentWithChildren.forEach(item => {
        const coordId = item.coordinates;
        const itemCoords = CoordSystem.parseId(coordId);

        siblingItems[coordId] = {
          data: {
            title: item.title,
            content: item.content,
        preview: item.preview,
            link: item.link,
            color: getColor(itemCoords),
          },
          metadata: {
            coordId,
            dbId: item.id,
            depth: itemCoords.path.length,
            parentId: item.parentId ? item.parentId.toString() : undefined,
            coordinates: itemCoords,
            ownerId: item.ownerId,
          },
          state: {
            isDragged: false,
            isHovered: false,
            isSelected: false,
            isExpanded: false,
            isDragOver: false,
            isHovering: false,
          },
        };
      });

      // Dispatch siblings to cache
      dispatch(cacheActions.updateItems(siblingItems));
    }
  } catch (error) {
    console.error('[NAV] Failed to load siblings:', error);
  }
}