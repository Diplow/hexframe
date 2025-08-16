import { CoordSystem } from "~/lib/domains/mapping/interface";
import type { TileData } from "../../types/tile-data";

/**
 * Hierarchy Service
 * 
 * Provides utilities for traversing and understanding tile hierarchy relationships.
 * These functions operate on the tile data structure to extract parent-child relationships.
 */

/**
 * Builds the parent hierarchy chain from root to direct parent (excluding current center)
 */
export const getParentHierarchy = (
  centerCoordId: string,
  items: Record<string, TileData>,
): TileData[] => {
  const hierarchy: TileData[] = [];
  let currentCoordId = centerCoordId;

  // Traverse up the parent chain
  while (true) {
    const parentCoordId = CoordSystem.getParentCoordFromId(currentCoordId);
    if (!parentCoordId) {
      break; // Reached the root (no parent)
    }

    const parentItem = items[parentCoordId];
    if (!parentItem) {
      break; // Parent item not found in the items record
    }

    hierarchy.unshift(parentItem); // Add to front to maintain root-to-parent order
    currentCoordId = parentCoordId;
  }

  return hierarchy;
};

/**
 * Checks if the given item is a UserMapItem center (has no parent)
 */
export const isUserMapCenter = (item: TileData): boolean => {
  return item.metadata.coordinates.path.length === 0;
};

/**
 * Determines if the hierarchy should be displayed
 * Returns false if:
 * - No hierarchy exists (center is UserMapItem with no parents)
 * - Center is already one of the hierarchy items (we navigated to a parent)
 */
export const shouldShowHierarchy = (
  hierarchy: TileData[],
  currentCenter?: string,
): boolean => {
  // No hierarchy to show
  if (hierarchy.length === 0) {
    return false;
  }

  // If we have a current center and it's one of the items in the hierarchy,
  // then we're already looking at a parent item, so don't show hierarchy
  if (currentCenter) {
    const isViewingHierarchyItem = hierarchy.some(
      (item) => item.metadata.coordId === currentCenter,
    );
    if (isViewingHierarchyItem) {
      return false;
    }
  }

  return true;
};

/**
 * Gets the current center item from the items record
 */
export const getCenterItem = (
  centerCoordId: string,
  items: Record<string, TileData>,
): TileData | null => {
  return items[centerCoordId] ?? null;
};