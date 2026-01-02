import type { Dispatch } from "react";
import type { CacheAction } from "~/app/map/Cache/State";
import { cacheActions } from "~/app/map/Cache/State";
import type { ServerService } from "~/app/map/Cache/Services";
import { checkAncestors, loadAncestorsForItem } from "~/app/map/Cache/Handlers";
import { CoordSystem } from "~/lib/domains/mapping/utils";
import type { TileData } from "~/app/map/types";
import { getColor } from "~/app/map/types";
import { Visibility } from '~/lib/domains/mapping/utils';

// Type for items returned by ServerService
type ServerItem = Awaited<ReturnType<ServerService['fetchItemsForCoordinate']>>[0];

/**
 * Core prefetch operation logic
 */
export async function executePrefetchRegion(
  centerCoordId: string,
  maxDepth: number,
  dispatch: Dispatch<CacheAction>,
  serverService: ServerService,
  loadingCenters: Set<string>
): Promise<void> {
  // Prevent concurrent loads for the same center
  if (loadingCenters.has(centerCoordId)) {
    return;
  }

  try {
    loadingCenters.add(centerCoordId);

    // Set loading state before fetching
    dispatch(cacheActions.setLoading(true));

    const items = await serverService.fetchItemsForCoordinate({
      centerCoordId,
      maxDepth,
    });

    // Items fetched successfully
    dispatch(
      cacheActions.loadRegion(
        items as Parameters<typeof cacheActions.loadRegion>[0],
        centerCoordId,
        maxDepth,
      ),
    );

    // Clear loading state after successful load
    dispatch(cacheActions.setLoading(false));

    // Handle ancestor loading if needed
    await handleAncestorLoading(centerCoordId, items, dispatch, serverService);
  } catch (error) {
    console.error('[MapCache] Failed to load region:', error);
    dispatch(cacheActions.setError(error as Error));
    dispatch(cacheActions.setLoading(false));
  } finally {
    loadingCenters.delete(centerCoordId);
  }
}

/**
 * Handle ancestor loading for sub-tiles
 */
async function handleAncestorLoading(
  centerCoordId: string,
  items: ServerItem[],
  dispatch: Dispatch<CacheAction>,
  serverService: ServerService
): Promise<void> {
  // Check if ancestors need to be loaded for the center item
  const centerItem = items.find(item => item.coordinates === centerCoordId);
  if (!centerItem?.coordinates?.includes(':')) {
    return; // Not a sub-tile
  }

  // This is a sub-tile, check if we need to load ancestors
  const { hasAllAncestors } = checkAncestors(centerCoordId, items);

  // Load ancestors if missing
  if (!hasAllAncestors && centerItem.id) {
    const centerDbId = parseInt(centerItem.id);
    if (!isNaN(centerDbId)) {
      void loadAncestorsForItem(centerDbId, serverService, dispatch, "Initial Load");
    }
  }

  // Also load siblings for the center item if it has a parent
  const parentCoordId = CoordSystem.getParentCoordFromId(centerCoordId);
  if (parentCoordId) {
    void loadSiblingsForInitialLoad(parentCoordId, serverService, dispatch);
  }
}

/**
 * Load siblings for an item by fetching its parent with 1 generation of children
 */
async function loadSiblingsForInitialLoad(
  parentCoordId: string,
  serverService: ServerService,
  dispatch: Dispatch<CacheAction>
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
            visibility: item.visibility ?? Visibility.PRIVATE,
            itemType: item.itemType,
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
    console.error('[PREFETCH] Failed to load siblings:', error);
  }
}