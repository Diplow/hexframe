import type { CacheState } from "~/app/map/Cache/State";
import type { TileData } from "~/app/map/types/tile-data";
import * as hierarchyService from "~/app/map/Cache/Services/hierarchy-service";

/**
 * Create hierarchy operation callbacks for the public MapCache API
 */
export function createHierarchyCallbacks(state: CacheState) {
  const getParentHierarchy = (centerCoordId?: string) => {
    const effectiveCenter = centerCoordId ?? state.currentCenter;
    if (!effectiveCenter) return [];
    return hierarchyService.getParentHierarchy(effectiveCenter, state.itemsById);
  };

  const getCenterItem = (centerCoordId?: string) => {
    const effectiveCenter = centerCoordId ?? state.currentCenter;
    if (!effectiveCenter) return null;
    return hierarchyService.getCenterItem(effectiveCenter, state.itemsById);
  };

  const isUserMapCenter = (item: TileData) => {
    return hierarchyService.isUserMapCenter(item);
  };

  const shouldShowHierarchy = (hierarchy: TileData[], currentCenter?: string) => {
    return hierarchyService.shouldShowHierarchy(
      hierarchy,
      currentCenter ?? state.currentCenter ?? undefined
    );
  };

  return {
    getParentHierarchy,
    getCenterItem,
    isUserMapCenter,
    shouldShowHierarchy,
  };
}