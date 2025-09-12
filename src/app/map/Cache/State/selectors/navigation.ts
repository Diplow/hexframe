import type { CacheState } from "~/app/map/Cache/State/types";
import type { TileData } from "~/app/map/types";
import { CoordSystem } from "~/lib/domains/mapping/utils";
import { createMemoizedSelector } from "./items";

// Coordinate and hierarchy selectors
export const selectItemParent = (
  state: CacheState,
  coordId: string,
): TileData | null => {
  const item = state.itemsById[coordId];
  if (!item || item.metadata.coordinates.path.length <= 0) return null;

  const parentCoordId = CoordSystem.getParentCoordFromId(coordId);
  if (!parentCoordId) return null;

  return state.itemsById[parentCoordId] ?? null;
};

export const selectItemChildren = (
  state: CacheState,
  coordId: string,
): TileData[] => {
  const item = state.itemsById[coordId];
  if (!item) return [];

  const itemCoords = item.metadata.coordinates;

  return Object.values(state.itemsById).filter((candidateItem) => {
    const candidateCoords = candidateItem.metadata.coordinates;

    // Must be in same coordinate tree
    if (
      candidateCoords.userId !== itemCoords.userId ||
      candidateCoords.groupId !== itemCoords.groupId
    ) {
      return false;
    }

    // Must be direct child (one level deeper)
    if (candidateCoords.path.length !== itemCoords.path.length + 1) {
      return false;
    }

    // Must have item's path as prefix
    return itemCoords.path.every(
      (coord, i) => candidateCoords.path[i] === coord,
    );
  });
};

// Derived state selectors
export const selectItemsByDepth = createMemoizedSelector(
  ({
    state,
    centerCoordId,
    targetDepth,
  }: {
    state: CacheState;
    centerCoordId: string;
    targetDepth: number;
  }): TileData[] => {
    const centerItem = state.itemsById[centerCoordId];
    if (!centerItem) return [];

    const centerDepth = centerItem.metadata.coordinates.path.length;
    const absoluteTargetDepth = centerDepth + targetDepth;

    return Object.values(state.itemsById).filter(
      (item) => item.metadata.coordinates.path.length === absoluteTargetDepth,
    );
  },
);

export const selectMaxLoadedDepth = (
  state: CacheState,
  centerCoordId: string,
): number => {
  const centerItem = state.itemsById[centerCoordId];
  if (!centerItem) return 0;

  const centerCoords = centerItem.metadata.coordinates;
  const centerDepth = centerCoords.path.length;
  let maxDepth = 0;

  Object.values(state.itemsById).forEach((item) => {
    const itemCoords = item.metadata.coordinates;
    
    // Skip items not in same coordinate tree
    if (itemCoords.userId !== centerCoords.userId || 
        itemCoords.groupId !== centerCoords.groupId) {
      return;
    }

    // Skip items that aren't descendants
    if (itemCoords.path.length <= centerDepth) return;
    
    // Check if this is actually a descendant
    const isDescendant = centerCoords.path.every(
      (coord, i) => itemCoords.path[i] === coord
    );
    
    if (isDescendant) {
      const relativeDepth = itemCoords.path.length - centerDepth;
      maxDepth = Math.max(maxDepth, relativeDepth);
    }
  });

  return maxDepth;
};