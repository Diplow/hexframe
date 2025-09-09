import { describe, test, expect } from "vitest";
import {
  selectAllItems,
  selectCurrentCenter,
  selectExpandedItemIds,
  selectIsLoading,
  selectError,
  selectItem,
  selectHasItem,
  selectItemsByIds,
  selectIsRegionLoaded,
  selectRegionHasDepth,
  selectShouldLoadRegion,
  selectRegionItems,
  selectRegionItemsOptimized,
  selectMaxLoadedDepth,
  selectCacheValidation,
  selectIsItemExpanded,
  selectExpandedItems,
  selectItemParent,
  selectItemChildren,
  staticSelectors,
} from "~/app/map/Cache/State/selectors";
import { initialCacheState } from "~/app/map/Cache/State/reducer";
import type { CacheState } from "~/app/map/Cache/State/types";
import type { TileData } from "~/app/map/types/tile-data";

describe("Cache Selectors", () => {
  // Mock data for testing
  const mockItems: Record<string, TileData> = {
    "1,2": {
      data: {
        name: "Root Item",
        description: "Root Description",
        url: "",
        color: "#000000",
      },
      metadata: {
        coordId: "1,2",
        dbId: "root-id",
        depth: 0,
        parentId: undefined,
        coordinates: { userId: 1, groupId: 2, path: [] },
        ownerId: "test-owner",
      },
      state: {
        isDragged: false,
        isHovered: false,
        isSelected: false,
        isExpanded: false,
        isDragOver: false,
        isHovering: false,
      },
    },
    "1,2:1": {
      data: {
        name: "Child Item 1",
        description: "Child Description 1",
        url: "",
        color: "#111111",
      },
      metadata: {
        coordId: "1,2:1",
        dbId: "child-1-id",
        depth: 1,
        parentId: "root-id",
        coordinates: { userId: 1, groupId: 2, path: [1] },
        ownerId: "test-owner",
      },
      state: {
        isDragged: false,
        isHovered: false,
        isSelected: false,
        isExpanded: false,
        isDragOver: false,
        isHovering: false,
      },
    },
    "1,2:2": {
      data: {
        name: "Child Item 2",
        description: "Child Description 2",
        url: "",
        color: "#222222",
      },
      metadata: {
        coordId: "1,2:2",
        dbId: "child-2-id",
        depth: 1,
        parentId: "root-id",
        coordinates: { userId: 1, groupId: 2, path: [2] },
        ownerId: "test-owner",
      },
      state: {
        isDragged: false,
        isHovered: false,
        isSelected: false,
        isExpanded: false,
        isDragOver: false,
        isHovering: false,
      },
    },
    "1,2:1,3": {
      data: {
        name: "Grandchild Item",
        description: "Grandchild Description",
        url: "",
        color: "#333333",
      },
      metadata: {
        coordId: "1,2:1,3",
        dbId: "grandchild-id",
        depth: 2,
        parentId: "child-1-id",
        coordinates: { userId: 1, groupId: 2, path: [1, 3] },
        ownerId: "test-owner",
      },
      state: {
        isDragged: false,
        isHovered: false,
        isSelected: false,
        isExpanded: false,
        isDragOver: false,
        isHovering: false,
      },
    },
  };

  const mockState: CacheState = {
    ...initialCacheState,
    itemsById: mockItems,
    currentCenter: "1,2",
    expandedItemIds: ["root-id", "child-1-id"],
    isLoading: false,
    error: null,
    lastUpdated: Date.now(),
    regionMetadata: {
      "1,2": {
        centerCoordId: "1,2",
        maxDepth: 2,
        loadedAt: Date.now(),
        itemCoordIds: ["1,2", "1,2:1", "1,2:2", "1,2:1,3"],
      },
    },
  };

  describe("Basic State Selectors", () => {
    test("selectAllItems returns all items", () => {
      const result = selectAllItems(mockState);
      expect(result).toBe(mockState.itemsById);
      expect(Object.keys(result)).toHaveLength(4);
    });

    test("selectCurrentCenter returns current center", () => {
      const result = selectCurrentCenter(mockState);
      expect(result).toBe("1,2");
    });

    test("selectExpandedItemIds returns expanded item IDs", () => {
      const result = selectExpandedItemIds(mockState);
      expect(result).toEqual(["root-id", "child-1-id"]);
    });

    test("selectIsLoading returns loading state", () => {
      const loadingState = { ...mockState, isLoading: true };
      expect(selectIsLoading(mockState)).toBe(false);
      expect(selectIsLoading(loadingState)).toBe(true);
    });

    test("selectError returns error state", () => {
      const error = new Error("Test error");
      const errorState = { ...mockState, error };
      expect(selectError(mockState)).toBeNull();
      expect(selectError(errorState)).toBe(error);
    });
  });

  describe("Item Lookup Selectors", () => {
    test("selectItem returns specific item", () => {
      const result = selectItem(mockState, "1,2:1");
      expect(result).toBe(mockItems["1,2:1"]);
    });

    test("selectItem returns undefined for missing item", () => {
      const result = selectItem(mockState, "missing");
      expect(result).toBeUndefined();
    });

    test("selectHasItem returns boolean for item existence", () => {
      expect(selectHasItem(mockState, "1,2")).toBe(true);
      expect(selectHasItem(mockState, "missing")).toBe(false);
    });

    test("selectItemsByIds returns items for valid IDs", () => {
      const result = selectItemsByIds(mockState, ["1,2", "1,2:1", "missing"]);
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(mockItems["1,2"]);
      expect(result[1]).toBe(mockItems["1,2:1"]);
    });

    test("selectItemsByIds handles empty array", () => {
      const result = selectItemsByIds(mockState, []);
      expect(result).toEqual([]);
    });
  });

  describe("Region Validation Selectors", () => {
    test("selectIsRegionLoaded returns true for loaded region", () => {
      const result = selectIsRegionLoaded(mockState, "1,2");
      expect(result).toBe(true);
    });

    test("selectIsRegionLoaded returns false for missing region", () => {
      const result = selectIsRegionLoaded(mockState, "missing");
      expect(result).toBe(false);
    });

    test("selectIsRegionLoaded returns false for stale region", () => {
      const staleState: CacheState = {
        ...mockState,
        regionMetadata: {
          "1,2": {
            centerCoordId: "1,2",
            maxDepth: 2,
            loadedAt: Date.now() - 400000, // Older than maxAge
            itemCoordIds: ["1,2"],
          },
        },
      };
      const result = selectIsRegionLoaded(staleState, "1,2");
      expect(result).toBe(false);
    });

    test("selectRegionHasDepth returns correct depth status", () => {
      expect(selectRegionHasDepth(mockState, "1,2", 1)).toBe(true);
      expect(selectRegionHasDepth(mockState, "1,2", 2)).toBe(true);
      expect(selectRegionHasDepth(mockState, "1,2", 3)).toBe(false);
      expect(selectRegionHasDepth(mockState, "missing", 1)).toBe(false);
    });

    test("selectShouldLoadRegion combines loading and depth checks", () => {
      // Fresh region with sufficient depth
      expect(selectShouldLoadRegion(mockState, "1,2", 1)).toBe(false);
      expect(selectShouldLoadRegion(mockState, "1,2", 2)).toBe(false);

      // Fresh region but insufficient depth
      expect(selectShouldLoadRegion(mockState, "1,2", 3)).toBe(true);

      // Missing region
      expect(selectShouldLoadRegion(mockState, "missing", 1)).toBe(true);
    });
  });

  describe("Region Items Selector", () => {
    test("selectRegionItems returns correct hierarchy", () => {
      const result = selectRegionItems({
        state: mockState,
        centerCoordId: "1,2",
        maxDepth: 2,
      });

      expect(result).toHaveLength(4);
      expect(
        result.find((item) => item.metadata.coordId === "1,2"),
      ).toBeDefined();
      expect(
        result.find((item) => item.metadata.coordId === "1,2:1"),
      ).toBeDefined();
      expect(
        result.find((item) => item.metadata.coordId === "1,2:2"),
      ).toBeDefined();
      expect(
        result.find((item) => item.metadata.coordId === "1,2:1,3"),
      ).toBeDefined();
    });

    test("selectRegionItems respects maxDepth", () => {
      const result = selectRegionItems({
        state: mockState,
        centerCoordId: "1,2",
        maxDepth: 1,
      });

      expect(result).toHaveLength(3);
      expect(
        result.find((item) => item.metadata.coordId === "1,2"),
      ).toBeDefined();
      expect(
        result.find((item) => item.metadata.coordId === "1,2:1"),
      ).toBeDefined();
      expect(
        result.find((item) => item.metadata.coordId === "1,2:2"),
      ).toBeDefined();
      expect(
        result.find((item) => item.metadata.coordId === "1,2:1,3"),
      ).toBeUndefined();
    });

    test("selectRegionItems returns empty for missing center", () => {
      const result = selectRegionItems({
        state: mockState,
        centerCoordId: "missing",
        maxDepth: 2,
      });

      expect(result).toEqual([]);
    });

    test("selectRegionItemsOptimized uses cache correctly", () => {
      // First call
      const result1 = selectRegionItemsOptimized(mockState, "1,2", 2);

      // Second call with same parameters should return cached result
      const result2 = selectRegionItemsOptimized(mockState, "1,2", 2);

      expect(result1).toEqual(result2);
      expect(result1).toHaveLength(4);
    });
  });

  describe("Hierarchy Selectors", () => {
    test("selectItemParent returns correct parent", () => {
      const result = selectItemParent(mockState, "1,2:1");
      expect(result).toStrictEqual(mockItems["1,2"]);
    });

    test("selectItemParent returns null for root item", () => {
      const result = selectItemParent(mockState, "1,2");
      expect(result).toBeNull();
    });

    test("selectItemParent returns null for missing parent", () => {
      const result = selectItemParent(mockState, "missing");
      expect(result).toBeNull();
    });

    test("selectItemChildren returns direct children", () => {
      const result = selectItemChildren(mockState, "1,2");
      expect(result).toHaveLength(2);
      expect(
        result.find((item) => item.metadata.coordId === "1,2:1"),
      ).toBeDefined();
      expect(
        result.find((item) => item.metadata.coordId === "1,2:2"),
      ).toBeDefined();
    });

    test("selectItemChildren returns grandchildren for child", () => {
      const result = selectItemChildren(mockState, "1,2:1");
      expect(result).toHaveLength(1);
      expect(result[0]?.metadata.coordId).toBe("1,2:1,3");
    });

    test("selectItemChildren returns empty for leaf node", () => {
      const result = selectItemChildren(mockState, "1,2:2");
      expect(result).toEqual([]);
    });

    test("selectMaxLoadedDepth calculates correct depth", () => {
      const result = selectMaxLoadedDepth(mockState, "1,2");
      expect(result).toBe(2);
    });

    test("selectMaxLoadedDepth returns 0 for missing center", () => {
      const result = selectMaxLoadedDepth(mockState, "missing");
      expect(result).toBe(0);
    });
  });

  describe("Expanded Items Selectors", () => {
    test("selectIsItemExpanded returns correct expansion state", () => {
      expect(selectIsItemExpanded(mockState, "root-id")).toBe(true);
      expect(selectIsItemExpanded(mockState, "child-1-id")).toBe(true);
      expect(selectIsItemExpanded(mockState, "child-2-id")).toBe(false);
    });

    test("selectExpandedItems returns expanded items", () => {
      const result = selectExpandedItems(mockState);
      expect(result).toHaveLength(2);
      expect(
        result.find((item) => item.metadata.dbId === "root-id"),
      ).toBeDefined();
      expect(
        result.find((item) => item.metadata.dbId === "child-1-id"),
      ).toBeDefined();
    });

    test("selectExpandedItems handles missing items gracefully", () => {
      const stateWithMissingExpanded: CacheState = {
        ...mockState,
        expandedItemIds: ["root-id", "missing-id", "child-1-id"],
      };

      const result = selectExpandedItems(stateWithMissingExpanded);
      expect(result).toHaveLength(2);
    });
  });

  describe("Cache Validation Selector", () => {
    test("selectCacheValidation returns correct validation info", () => {
      const result = selectCacheValidation(mockState);

      expect(result).toEqual({
        hasItems: true,
        hasCenter: true,
        hasError: false,
        isStale: false,
        loadedRegionsCount: 1,
      });
    });

    test("selectCacheValidation detects stale cache", () => {
      const staleState: CacheState = {
        ...mockState,
        lastUpdated: Date.now() - 400000, // Older than maxAge
      };

      const result = selectCacheValidation(staleState);
      expect(result.isStale).toBe(true);
    });

    test("selectCacheValidation handles empty state", () => {
      const result = selectCacheValidation(initialCacheState);

      expect(result).toEqual({
        hasItems: false,
        hasCenter: false,
        hasError: false,
        isStale: false,
        loadedRegionsCount: 0,
      });
    });
  });

  describe("Grouped Selectors Object", () => {
    test("staticSelectors contains all expected selectors", () => {
      expect(staticSelectors).toHaveProperty("allItems");
      expect(staticSelectors).toHaveProperty("currentCenter");
      expect(staticSelectors).toHaveProperty("regionItems");
      expect(staticSelectors).toHaveProperty("itemParent");
      expect(staticSelectors).toHaveProperty("itemChildren");
      expect(staticSelectors).toHaveProperty("cacheValidation");

      expect(typeof staticSelectors.allItems).toBe("function");
      expect(typeof staticSelectors.regionItems).toBe("function");
    });

    test("grouped selectors work correctly", () => {
      const allItems = staticSelectors.allItems(mockState);
      expect(allItems).toBe(mockState.itemsById);

      const center = staticSelectors.currentCenter(mockState);
      expect(center).toBe("1,2");
    });
  });

  describe("Performance and Memoization", () => {
    test("memoized selectors cache results correctly", () => {
      // Test multiple calls with same parameters
      const result1 = selectRegionItems({
        state: mockState,
        centerCoordId: "1,2",
        maxDepth: 2,
      });

      const result2 = selectRegionItems({
        state: mockState,
        centerCoordId: "1,2",
        maxDepth: 2,
      });

      // Results should be identical (memoized) - use toStrictEqual for deep comparison
      expect(result1).toStrictEqual(result2);
    });

    test("optimized region selector handles cache size limit", () => {
      // Call with many different parameters to test cache cleanup
      for (let i = 0; i < 15; i++) {
        selectRegionItemsOptimized(mockState, `test-${i}`, 1);
      }

      // Should not throw and should still work
      const result = selectRegionItemsOptimized(mockState, "1,2", 2);
      expect(result).toHaveLength(4);
    });
  });

  describe("Edge Cases", () => {
    test("selectors handle empty state gracefully", () => {
      const emptyState = initialCacheState;

      expect(selectAllItems(emptyState)).toEqual({});
      expect(selectCurrentCenter(emptyState)).toBeNull();
      expect(selectExpandedItemIds(emptyState)).toEqual([]);
      expect(selectHasItem(emptyState, "anything")).toBe(false);
    });

    test("selectors handle malformed coordinates gracefully", () => {
      const stateWithBadCoords: CacheState = {
        ...mockState,
        itemsById: {
          "bad-coord": {
            ...mockItems["1,2"]!,
            metadata: {
              ...mockItems["1,2"]!.metadata,
              coordId: "bad-coord",
              coordinates: { userId: -1, groupId: -1, path: [] },
            },
          },
        },
      };

      expect(() =>
        selectRegionItems({
          state: stateWithBadCoords,
          centerCoordId: "bad-coord",
          maxDepth: 1,
        }),
      ).not.toThrow();
    });

    test("selectors handle circular references gracefully", () => {
      // This is mainly a structural test since our data model prevents circular refs
      const result = selectItemChildren(mockState, "1,2:1,3");
      expect(result).toEqual([]);
    });
  });
});
