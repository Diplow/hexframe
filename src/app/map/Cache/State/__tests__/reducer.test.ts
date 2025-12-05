import { cacheReducer, initialCacheState } from "~/app/map/Cache/State/reducer";
import { ACTION_TYPES } from "~/app/map/Cache/State/types";
import type { CacheState, CacheAction, RegionMetadata } from "~/app/map/Cache/State/types";
import type { MapItemAPIContract } from "~/server/api/types/contracts";
import { MapItemType } from "~/lib/domains/mapping";
import { Visibility } from '~/lib/domains/mapping/utils';

describe("Cache Reducer", () => {
  // Mock data for testing
  const mockItems: MapItemAPIContract[] = [
    {
      id: "1",
      coordinates: "1,2",
      title: "Test Item 1",
      content: "Test Description 1",
      preview: undefined,
      depth: 1,
      link: "",
      parentId: null,
      itemType: MapItemType.BASE,
      ownerId: "test-owner",
      originId: null,
      visibility: Visibility.PRIVATE,
    },
    {
      id: "2",
      coordinates: "1,3",
      title: "Test Item 2",
      content: "Test Description 2",
      preview: undefined,
      depth: 2,
      link: "",
      parentId: null,
      itemType: MapItemType.BASE,
      ownerId: "test-owner",
      originId: null,
      visibility: Visibility.PRIVATE,
    },
  ];

  const mockState: CacheState = {
    ...initialCacheState,
    currentCenter: "1,2",
    expandedItemIds: ["1"],
    lastUpdated: 1000,
  };

  describe("Initial State", () => {
    test("initialCacheState has correct structure", () => {
      expect(initialCacheState).toEqual({
        itemsById: {},
        regionMetadata: {},
        currentCenter: null,
        expandedItemIds: [],
        isCompositionExpanded: false,
        isLoading: false,
        error: null,
        lastUpdated: 0,
        cacheConfig: {
          maxAge: 300000,
          backgroundRefreshInterval: 30000,
          enableOptimisticUpdates: true,
          maxDepth: 3,
        },
      });
    });
  });

  describe("Pure Function Properties", () => {
    test("reducer returns same output for same input", () => {
      const action: CacheAction = {
        type: ACTION_TYPES.SET_CENTER,
        payload: "2,3",
      };

      const result1 = cacheReducer(mockState, action);
      const result2 = cacheReducer(mockState, action);

      expect(result1).toEqual(result2);
    });

    test("reducer does not mutate original state", () => {
      const originalState = { ...mockState };
      const action: CacheAction = {
        type: ACTION_TYPES.SET_LOADING,
        payload: true,
      };

      cacheReducer(mockState, action);

      expect(mockState).toEqual(originalState);
    });

    test("reducer creates new objects, not references", () => {
      const action: CacheAction = {
        type: ACTION_TYPES.SET_EXPANDED_ITEMS,
        payload: ["1", "2"],
      };

      const result = cacheReducer(mockState, action);

      expect(result).not.toBe(mockState);
      expect(result.expandedItemIds).not.toBe(mockState.expandedItemIds);
    });

    test("reducer is deterministic", () => {
      const action: CacheAction = {
        type: ACTION_TYPES.TOGGLE_ITEM_EXPANSION,
        payload: "1",
      };

      const results = Array.from({ length: 5 }, () =>
        cacheReducer(mockState, action),
      );

      // All results should be identical
      results.forEach((result) => {
        expect(result).toEqual(results[0]);
      });
    });
  });

  describe("LOAD_REGION Action", () => {
    test("loads region with items correctly", () => {
      const action: CacheAction = {
        type: ACTION_TYPES.LOAD_REGION,
        payload: {
          items: mockItems,
          centerCoordId: "1,2",
          maxDepth: 2,
        },
      };

      const result = cacheReducer(initialCacheState, action);

      expect(result.itemsById).toBeDefined();
      expect(Object.keys(result.itemsById)).toHaveLength(2);
      expect(result.regionMetadata["1,2"]).toEqual({
        centerCoordId: "1,2",
        maxDepth: 2,
        loadedAt: expect.any(Number) as number,
        itemCoordIds: ["1,2", "1,3"],
      });
      expect(result.error).toBeNull();
      expect(result.lastUpdated).toBeGreaterThan(0);
    });

    test("accepts items with zero in path (Direction.Center now valid)", () => {
      const itemsWithZero: MapItemAPIContract[] = [
        ...mockItems,
        {
          id: "3",
          coordinates: "1,2:0", // Direction.Center (0) is now valid for meta-orchestration
          title: "Meta Item",
          content: "Direction 0 is valid",
          preview: undefined,
          depth: 1,
          link: "",
          parentId: null,
          itemType: MapItemType.BASE,
          ownerId: "test-owner",
          originId: null,
          visibility: Visibility.PRIVATE,
        },
      ];

      const action: CacheAction = {
        type: ACTION_TYPES.LOAD_REGION,
        payload: {
          items: itemsWithZero,
          centerCoordId: "1,2",
          maxDepth: 2,
        },
      };

      const result = cacheReducer(initialCacheState, action);

      // Should have all 3 items (Direction.Center is now valid)
      expect(Object.keys(result.itemsById)).toHaveLength(3);
      expect(result.itemsById["1,2:0"]).toBeDefined();
      expect(result.itemsById["1,2:0"]?.data.title).toBe("Meta Item");
    });

    test("updates existing items when loading region", () => {
      const existingState: CacheState = {
        ...initialCacheState,
        itemsById: {
          "1,2": {
            data: {
              title: "Old Name",
              content: "Old Desc",
              preview: undefined,
              link: "",
              color: "#000000",
              visibility: Visibility.PRIVATE,
            },
            metadata: {
              coordId: "1,2",
              dbId: "1",
              depth: 1,
              parentId: undefined,
              coordinates: { userId: "user-test-1", groupId: 2, path: [1, 2] },
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
        },
      };

      const action: CacheAction = {
        type: ACTION_TYPES.LOAD_REGION,
        payload: {
          items: mockItems,
          centerCoordId: "1,2",
          maxDepth: 2,
        },
      };

      const result = cacheReducer(existingState, action);

      expect(result.itemsById["1,2"]?.data.title).toBe("Test Item 1");
    });
  });

  describe("LOAD_ITEM_CHILDREN Action", () => {
    test("loads item children correctly", () => {
      const action: CacheAction = {
        type: ACTION_TYPES.LOAD_ITEM_CHILDREN,
        payload: {
          items: mockItems,
          parentCoordId: "1,2",
          maxDepth: 1,
        },
      };

      const result = cacheReducer(initialCacheState, action);

      expect(Object.keys(result.itemsById)).toHaveLength(2);
      expect(result.lastUpdated).toBeGreaterThan(0);
    });

    test("does not update state if no data changes", () => {
      const stateWithItems: CacheState = {
        ...initialCacheState,
        itemsById: {
          "1,2": {
            data: {
              title: "Test Item 1",
              content: "Test Description 1",
              preview: undefined,
              link: "",
              color: "#000000",
              visibility: Visibility.PRIVATE,
            },
            metadata: {
              coordId: "1,2",
              dbId: "1",
              depth: 1,
              parentId: undefined,
              coordinates: { userId: "user-test-1", groupId: 2, path: [1, 2] },
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
          "1,3": {
            data: {
              title: "Test Item 2",
              content: "Test Description 2",
              preview: undefined,
              link: "",
              color: "#000000",
              visibility: Visibility.PRIVATE,
            },
            metadata: {
              coordId: "1,3",
              dbId: "2",
              depth: 2,
              parentId: undefined,
              coordinates: { userId: "user-test-1", groupId: 3, path: [1, 3] },
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
        },
        lastUpdated: 1000,
      };

      const action: CacheAction = {
        type: ACTION_TYPES.LOAD_ITEM_CHILDREN,
        payload: {
          items: mockItems,
          parentCoordId: "1,2",
          maxDepth: 1,
        },
      };

      const result = cacheReducer(stateWithItems, action);

      expect(result).toBe(stateWithItems); // Should return exact same reference
    });

    test("detects data changes correctly", () => {
      const stateWithItems: CacheState = {
        ...initialCacheState,
        itemsById: {
          "1,2": {
            data: {
              title: "Old Name",
              content: "Old Desc",
              preview: undefined,
              link: "",
              color: "#000000",
              visibility: Visibility.PRIVATE,
            },
            metadata: {
              coordId: "1,2",
              dbId: "1",
              depth: 1,
              parentId: undefined,
              coordinates: { userId: "user-test-1", groupId: 2, path: [1, 2] },
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
        },
        lastUpdated: 1000,
      };

      const action: CacheAction = {
        type: ACTION_TYPES.LOAD_ITEM_CHILDREN,
        payload: {
          items: mockItems,
          parentCoordId: "1,2",
          maxDepth: 1,
        },
      };

      const result = cacheReducer(stateWithItems, action);

      expect(result).not.toBe(stateWithItems);
      expect(result.lastUpdated).toBeGreaterThan(1000);
    });
  });

  describe("SET_CENTER Action", () => {
    test("sets center correctly", () => {
      const action: CacheAction = {
        type: ACTION_TYPES.SET_CENTER,
        payload: "2,3",
      };

      const result = cacheReducer(mockState, action);

      expect(result.currentCenter).toBe("2,3");
      expect(result).not.toBe(mockState);
    });
  });

  describe("SET_EXPANDED_ITEMS Action", () => {
    test("sets expanded items correctly", () => {
      const action: CacheAction = {
        type: ACTION_TYPES.SET_EXPANDED_ITEMS,
        payload: ["1", "2", "3"],
      };

      const result = cacheReducer(mockState, action);

      expect(result.expandedItemIds).toEqual(["1", "2", "3"]);
      expect(result.expandedItemIds).not.toBe(action.payload); // New array
    });

    test("handles empty expanded items", () => {
      const action: CacheAction = {
        type: ACTION_TYPES.SET_EXPANDED_ITEMS,
        payload: [],
      };

      const result = cacheReducer(mockState, action);

      expect(result.expandedItemIds).toEqual([]);
    });
  });

  describe("TOGGLE_ITEM_EXPANSION Action", () => {
    test("adds item to expanded items when not present", () => {
      const stateWithoutItem: CacheState = {
        ...mockState,
        expandedItemIds: ["2", "3"],
      };

      const action: CacheAction = {
        type: ACTION_TYPES.TOGGLE_ITEM_EXPANSION,
        payload: "1",
      };

      const result = cacheReducer(stateWithoutItem, action);

      expect(result.expandedItemIds).toContain("1");
      expect(result.expandedItemIds).toHaveLength(3);
    });

    test("removes item from expanded items when present", () => {
      const stateWithItem: CacheState = {
        ...mockState,
        expandedItemIds: ["1", "2", "3"],
      };

      const action: CacheAction = {
        type: ACTION_TYPES.TOGGLE_ITEM_EXPANSION,
        payload: "2",
      };

      const result = cacheReducer(stateWithItem, action);

      expect(result.expandedItemIds).not.toContain("2");
      expect(result.expandedItemIds).toEqual(["1", "3"]);
    });
  });

  describe("SET_LOADING Action", () => {
    test("sets loading state correctly", () => {
      const action: CacheAction = {
        type: ACTION_TYPES.SET_LOADING,
        payload: true,
      };

      const result = cacheReducer(mockState, action);

      expect(result.isLoading).toBe(true);
    });
  });

  describe("SET_ERROR Action", () => {
    test("sets error correctly", () => {
      const error = new Error("Test error");
      const action: CacheAction = {
        type: ACTION_TYPES.SET_ERROR,
        payload: error,
      };

      const result = cacheReducer(mockState, action);

      expect(result.error).toBe(error);
    });

    test("clears error when set to null", () => {
      const stateWithError: CacheState = {
        ...mockState,
        error: new Error("Existing error"),
      };

      const action: CacheAction = {
        type: ACTION_TYPES.SET_ERROR,
        payload: null,
      };

      const result = cacheReducer(stateWithError, action);

      expect(result.error).toBeNull();
    });
  });

  describe("INVALIDATE_REGION Action", () => {
    test("removes region metadata correctly", () => {
      const stateWithRegion: CacheState = {
        ...mockState,
        regionMetadata: {
          "1,2": {
            centerCoordId: "1,2",
            maxDepth: 2,
            loadedAt: 1000,
            itemCoordIds: ["1,2", "1,3"],
          },
          "2,3": {
            centerCoordId: "2,3",
            maxDepth: 1,
            loadedAt: 2000,
            itemCoordIds: ["2,3"],
          },
        },
      };

      const action: CacheAction = {
        type: ACTION_TYPES.INVALIDATE_REGION,
        payload: "1,2",
      };

      const result = cacheReducer(stateWithRegion, action);

      expect(result.regionMetadata["1,2"]).toBeUndefined();
      expect(result.regionMetadata["2,3"]).toBeDefined();
    });
  });

  describe("INVALIDATE_ALL Action", () => {
    test("clears all cache data", () => {
      const stateWithData: CacheState = {
        ...mockState,
        itemsById: { 
          "1,2": {
            data: { title: "Test", content: "", preview: undefined, link: "", color: "#000000", visibility: Visibility.PRIVATE },
            metadata: { 
              coordId: "1,2", 
              dbId: "1", 
              depth: 0, 
              parentId: undefined, 
              coordinates: { userId: "user-test-1", groupId: 2, path: [] },
              ownerId: "test-owner"
            },
            state: { isDragged: false, isHovered: false, isSelected: false, isExpanded: false, isDragOver: false, isHovering: false }
          }
        },
        regionMetadata: { "1,2": {} as RegionMetadata },
        lastUpdated: 5000,
      };

      const action: CacheAction = {
        type: ACTION_TYPES.INVALIDATE_ALL,
      };

      const result = cacheReducer(stateWithData, action);

      expect(result.itemsById).toEqual({});
      expect(result.regionMetadata).toEqual({});
      expect(result.lastUpdated).toBe(0);
    });
  });

  describe("UPDATE_CACHE_CONFIG Action", () => {
    test("updates cache config partially", () => {
      const action: CacheAction = {
        type: ACTION_TYPES.UPDATE_CACHE_CONFIG,
        payload: {
          maxAge: 10000,
          enableOptimisticUpdates: false,
        },
      };

      const result = cacheReducer(mockState, action);

      expect(result.cacheConfig).toEqual({
        ...mockState.cacheConfig,
        maxAge: 10000,
        enableOptimisticUpdates: false,
      });
    });

    test("preserves existing config when updating", () => {
      const action: CacheAction = {
        type: ACTION_TYPES.UPDATE_CACHE_CONFIG,
        payload: {
          maxAge: 15000,
        },
      };

      const result = cacheReducer(mockState, action);

      expect(result.cacheConfig.backgroundRefreshInterval).toBe(
        mockState.cacheConfig.backgroundRefreshInterval,
      );
      expect(result.cacheConfig.maxAge).toBe(15000);
    });
  });

  describe("Edge Cases", () => {
    test("handles unknown action gracefully", () => {
      const unknownAction = { type: "UNKNOWN_ACTION" } as unknown as CacheAction;

      // Reducer should return state unchanged for unknown actions
      const result = cacheReducer(mockState, unknownAction);
      expect(result).toBe(mockState);
    });

    test("handles empty items array", () => {
      const action: CacheAction = {
        type: ACTION_TYPES.LOAD_REGION,
        payload: {
          items: [],
          centerCoordId: "1,2",
          maxDepth: 1,
        },
      };

      const result = cacheReducer(initialCacheState, action);

      expect(result.itemsById).toEqual({});
      expect(result.regionMetadata["1,2"]).toEqual({
        centerCoordId: "1,2",
        maxDepth: 1,
        loadedAt: expect.any(Number) as number,
        itemCoordIds: [],
      });
    });

    test("handles malformed items gracefully", () => {
      const malformedItems: MapItemAPIContract[] = [
        {
          id: "",
          coordinates: "",
          title: "",
          content: "",
          preview: undefined,
          depth: -1,
          link: "",
          parentId: null,
          itemType: MapItemType.BASE,
          ownerId: "",
          originId: null,
          visibility: Visibility.PRIVATE,
        },
      ];

      const action: CacheAction = {
        type: ACTION_TYPES.LOAD_REGION,
        payload: {
          items: malformedItems,
          centerCoordId: "1,2",
          maxDepth: 1,
        },
      };

      // Should not throw error
      expect(() => cacheReducer(initialCacheState, action)).not.toThrow();
    });
  });

  describe("Performance and Memory", () => {
    test("does not create unnecessary object references", () => {
      const action: CacheAction = {
        type: ACTION_TYPES.SET_LOADING,
        payload: false,
      };

      // State already has isLoading: false
      const stateWithLoadingFalse: CacheState = {
        ...mockState,
        isLoading: false,
      };

      const result = cacheReducer(stateWithLoadingFalse, action);

      // Should create new state even if value doesn't change (reducer pattern)
      expect(result).not.toBe(stateWithLoadingFalse);
      expect(result.isLoading).toBe(false);
    });

    test("handles large item sets efficiently", () => {
      const largeItemSet: MapItemAPIContract[] = Array.from(
        { length: 1000 },
        (_, i) => ({
          id: i.toString(),
          coordinates: `${i},${i + 1}`,
          title: `Item ${i}`,
          content: `Description ${i}`,
          preview: undefined,
          depth: i % 5,
          link: "",
          parentId: null,
          itemType: MapItemType.BASE,
          ownerId: "test-owner",
          originId: null,
          visibility: Visibility.PRIVATE,
        }),
      );

      const action: CacheAction = {
        type: ACTION_TYPES.LOAD_REGION,
        payload: {
          items: largeItemSet,
          centerCoordId: "1,2",
          maxDepth: 3,
        },
      };

      const startTime = performance.now();
      const result = cacheReducer(initialCacheState, action);
      const endTime = performance.now();

      // Should complete within reasonable time (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(100); // 100ms
      expect(Object.keys(result.itemsById).length).toBeGreaterThan(0);
    });
  });

  describe("State Immutability", () => {
    test("does not mutate nested objects", () => {
      const stateWithNestedData: CacheState = {
        ...mockState,
        cacheConfig: {
          maxAge: 1000,
          backgroundRefreshInterval: 2000,
          enableOptimisticUpdates: true,
          maxDepth: 2,
        },
      };

      const originalConfig = { ...stateWithNestedData.cacheConfig };

      const action: CacheAction = {
        type: ACTION_TYPES.UPDATE_CACHE_CONFIG,
        payload: { maxAge: 5000 },
      };

      cacheReducer(stateWithNestedData, action);

      expect(stateWithNestedData.cacheConfig).toEqual(originalConfig);
    });

    test("creates new arrays for array fields", () => {
      const action: CacheAction = {
        type: ACTION_TYPES.SET_EXPANDED_ITEMS,
        payload: ["1", "2"],
      };

      const result = cacheReducer(mockState, action);

      expect(result.expandedItemIds).not.toBe(mockState.expandedItemIds);
      expect(result.expandedItemIds).not.toBe(action.payload);
    });
  });

  describe("TOGGLE_COMPOSITION_EXPANSION Action", () => {
    test("toggles composition from false to true", () => {
      const stateWithoutComposition: CacheState = {
        ...mockState,
        isCompositionExpanded: false,
      };

      const action: CacheAction = {
        type: ACTION_TYPES.TOGGLE_COMPOSITION_EXPANSION,
      };

      const result = cacheReducer(stateWithoutComposition, action);

      expect(result.isCompositionExpanded).toBe(true);
    });

    test("toggles composition from true to false", () => {
      const stateWithComposition: CacheState = {
        ...mockState,
        isCompositionExpanded: true,
      };

      const action: CacheAction = {
        type: ACTION_TYPES.TOGGLE_COMPOSITION_EXPANSION,
      };

      const result = cacheReducer(stateWithComposition, action);

      expect(result.isCompositionExpanded).toBe(false);
    });

    test("does not mutate original state", () => {
      const stateWithComposition: CacheState = {
        ...mockState,
        isCompositionExpanded: true,
      };
      const originalValue = stateWithComposition.isCompositionExpanded;

      const action: CacheAction = {
        type: ACTION_TYPES.TOGGLE_COMPOSITION_EXPANSION,
      };

      cacheReducer(stateWithComposition, action);

      expect(stateWithComposition.isCompositionExpanded).toBe(originalValue);
    });

    test("creates new state object", () => {
      const stateWithComposition: CacheState = {
        ...mockState,
        isCompositionExpanded: false,
      };

      const action: CacheAction = {
        type: ACTION_TYPES.TOGGLE_COMPOSITION_EXPANSION,
      };

      const result = cacheReducer(stateWithComposition, action);

      expect(result).not.toBe(stateWithComposition);
    });
  });

  describe("SET_COMPOSITION_EXPANSION Action", () => {
    test("sets composition to true", () => {
      const stateWithoutComposition: CacheState = {
        ...mockState,
        isCompositionExpanded: false,
      };

      const action: CacheAction = {
        type: ACTION_TYPES.SET_COMPOSITION_EXPANSION,
        payload: true,
      };

      const result = cacheReducer(stateWithoutComposition, action);

      expect(result.isCompositionExpanded).toBe(true);
    });

    test("sets composition to false", () => {
      const stateWithComposition: CacheState = {
        ...mockState,
        isCompositionExpanded: true,
      };

      const action: CacheAction = {
        type: ACTION_TYPES.SET_COMPOSITION_EXPANSION,
        payload: false,
      };

      const result = cacheReducer(stateWithComposition, action);

      expect(result.isCompositionExpanded).toBe(false);
    });

    test("does not mutate original state", () => {
      const stateWithComposition: CacheState = {
        ...mockState,
        isCompositionExpanded: false,
      };
      const originalValue = stateWithComposition.isCompositionExpanded;

      const action: CacheAction = {
        type: ACTION_TYPES.SET_COMPOSITION_EXPANSION,
        payload: true,
      };

      cacheReducer(stateWithComposition, action);

      expect(stateWithComposition.isCompositionExpanded).toBe(originalValue);
    });

    test("creates new state object when value changes", () => {
      const stateWithComposition: CacheState = {
        ...mockState,
        isCompositionExpanded: false,
      };

      const action: CacheAction = {
        type: ACTION_TYPES.SET_COMPOSITION_EXPANSION,
        payload: true,
      };

      const result = cacheReducer(stateWithComposition, action);

      expect(result).not.toBe(stateWithComposition);
    });
  });

  describe("SET_CENTER Action - Composition Reset", () => {
    test("resets composition when navigating to new center", () => {
      const stateWithComposition: CacheState = {
        ...mockState,
        currentCenter: "user-test-1,0:1",
        isCompositionExpanded: true,
      };

      const action: CacheAction = {
        type: ACTION_TYPES.SET_CENTER,
        payload: "user-test-1,0:2",
      };

      const result = cacheReducer(stateWithComposition, action);

      expect(result.currentCenter).toBe("user-test-1,0:2");
      expect(result.isCompositionExpanded).toBe(false);
    });

    test("preserves other state properties when resetting composition", () => {
      const stateWithComposition: CacheState = {
        ...mockState,
        currentCenter: "user-test-1,0:1",
        expandedItemIds: ["1", "2"],
        isCompositionExpanded: true,
      };

      const action: CacheAction = {
        type: ACTION_TYPES.SET_CENTER,
        payload: "user-test-1,0:2",
      };

      const result = cacheReducer(stateWithComposition, action);

      expect(result.currentCenter).toBe("user-test-1,0:2");
      expect(result.expandedItemIds).toEqual(["1", "2"]);
      expect(result.isCompositionExpanded).toBe(false);
    });
  });
});
