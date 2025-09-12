import type { CacheState, RegionMetadata } from "~/app/map/Cache/State/types";
import type { TileData } from "~/app/map/types";
import { CoordSystem } from "~/lib/domains/mapping/utils";

// Individual item selectors
export const selectItem = (
  state: CacheState,
  coordId: string,
): TileData | undefined => state.itemsById[coordId];

export const selectHasItem = (state: CacheState, coordId: string): boolean =>
  coordId in state.itemsById;

export const selectItemsByIds = (
  state: CacheState,
  coordIds: string[],
): (TileData | undefined)[] => {
  return coordIds.map((coordId) => state.itemsById[coordId]);
};

export const selectExpandedItems = (state: CacheState): TileData[] =>
  state.expandedItemIds
    .map((coordId) => state.itemsById[coordId])
    .filter((item): item is TileData => item !== undefined);

export const selectIsItemExpanded = (
  state: CacheState,
  coordId: string,
): boolean => state.expandedItemIds.includes(coordId);

// Utility functions for selectors  
export function createMemoizedSelector<TInput, TOutput>(
  selectorFn: (input: TInput) => TOutput,
  _isEqual: (a: TOutput, b: TOutput) => boolean = (a, b) => a === b,
) {
  let lastInput: TInput;
  let lastOutput: TOutput;
  let hasValue = false;

  return (input: TInput): TOutput => {
    if (!hasValue || input !== lastInput) {
      lastOutput = selectorFn(input);
      lastInput = input;
      hasValue = true;
    }
    return lastOutput;
  };
}

export const isRegionStale = (metadata: RegionMetadata, maxAge: number): boolean => {
  return Date.now() - metadata.loadedAt > maxAge;
};

export const filterItemsInRegion = (
  items: Record<string, TileData>,
  centerCoordId: string,
  maxDepth: number,
): TileData[] => {
  const result: TileData[] = [];
  const centerCoords = CoordSystem.parseId(centerCoordId);

  for (const item of Object.values(items)) {
    const itemCoords = item.metadata.coordinates;

    if (
      itemCoords.userId === centerCoords.userId &&
      itemCoords.groupId === centerCoords.groupId
    ) {
      const relativePath = itemCoords.path.slice(centerCoords.path.length);
      const depth = relativePath.length;

      if (depth <= maxDepth) {
        result.push(item);
      }
    }
  }

  return result;
};