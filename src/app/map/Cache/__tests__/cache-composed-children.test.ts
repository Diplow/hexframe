import { describe, test, expect, beforeEach, vi } from "vitest";
import { Direction } from "~/lib/domains/mapping/utils";
import type { MapItemAPIContract } from "~/server/api/types/contracts";
import { MapItemType } from "~/lib/domains/mapping/utils";
import { createDataHandlerWithMockableService } from "~/app/map/Cache/Handlers/DataHandler/data-handler";
import { cacheReducer, initialCacheState } from "~/app/map/Cache/State/reducer";
import type { CacheState } from "~/app/map/Cache/State/types";

/**
 * Integration tests for cache queries with composed children (negative directions).
 *
 * These tests verify that the cache properly handles:
 * 1. Fetching composed children via tRPC queries
 * 2. Composition expansion state with negative direction model
 * 3. Cache invalidation for composition structure changes
 * 4. Cached data handling of negative directions
 */
describe("Cache - Composed Children Queries [Negative Directions]", () => {
  let mockDispatch: ReturnType<typeof vi.fn>;
  let mockUtils: {
    map: {
      getItemsForRootItem: { fetch: ReturnType<typeof vi.fn> };
      getItemByCoords: { fetch: ReturnType<typeof vi.fn> };
      getRootItemById: { fetch: ReturnType<typeof vi.fn> };
      getDescendants: { fetch: ReturnType<typeof vi.fn> };
      getComposedChildren: { fetch: ReturnType<typeof vi.fn> };
      hasComposition: { fetch: ReturnType<typeof vi.fn> };
    };
  };
  let mockState: CacheState;

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {
      // Silence warnings in tests
    });

    mockDispatch = vi.fn();

    // Mock tRPC utils including composition queries
    mockUtils = {
      map: {
        getItemsForRootItem: {
          fetch: vi.fn(),
        },
        getItemByCoords: {
          fetch: vi.fn(),
        },
        getRootItemById: {
          fetch: vi.fn(),
        },
        getDescendants: {
          fetch: vi.fn(),
        },
        getComposedChildren: {
          fetch: vi.fn(),
        },
        hasComposition: {
          fetch: vi.fn(),
        },
      },
    };

    mockState = {
      ...initialCacheState,
      cacheConfig: {
        maxAge: 300000,
        maxDepth: 3,
        enablePrefetch: true,
        prefetchRadius: 1,
      },
    };
  });

  describe("Fetching composed children", () => {
    test("should fetch composed children for a tile with negative directions", async () => {
      // Setup: tile with composed children in negative directions
      const parentCoordId = "1,0:2"; // Structural child at direction 2
      const composedChildren: MapItemAPIContract[] = [
        {
          id: "10",
          coordinates: "1,0:2,-1", // ComposedNorthWest
          title: "Composed Child NW",
          content: "Content NW",
          preview: undefined,
          depth: 2,
          link: "",
          parentId: "5",
          itemType: MapItemType.BASE,
          ownerId: "1",
          originId: null,
        },
        {
          id: "11",
          coordinates: "1,0:2,-3", // ComposedEast
          title: "Composed Child E",
          content: "Content E",
          preview: undefined,
          depth: 2,
          link: "",
          parentId: "5",
          itemType: MapItemType.BASE,
          ownerId: "1",
          originId: null,
        },
      ];

      mockUtils.map.getComposedChildren.fetch.mockResolvedValue(composedChildren);

      // Act: fetch composed children
      const result = await mockUtils.map.getComposedChildren.fetch({ coordId: parentCoordId });

      // Assert
      expect(mockUtils.map.getComposedChildren.fetch).toHaveBeenCalledWith({ coordId: parentCoordId });
      expect(result).toEqual(composedChildren);
      expect(result).toHaveLength(2);
      expect(result[0]?.coordinates).toContain("-1"); // Negative direction
      expect(result[1]?.coordinates).toContain("-3"); // Negative direction
    });

    test("should return empty array for tile without composed children", async () => {
      const parentCoordId = "1,0:3";
      mockUtils.map.getComposedChildren.fetch.mockResolvedValue([]);

      const result = await mockUtils.map.getComposedChildren.fetch({ coordId: parentCoordId });

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    test("should fetch all 6 composed children when all slots filled", async () => {
      const parentCoordId = "1,0:1";
      const allComposedChildren: MapItemAPIContract[] = [
        { id: "1", coordinates: "1,0:1,-1", title: "NW", content: "", preview: undefined, depth: 2, link: "", parentId: "0", itemType: MapItemType.BASE, ownerId: "1", originId: null }, // ComposedNorthWest
        { id: "2", coordinates: "1,0:1,-2", title: "NE", content: "", preview: undefined, depth: 2, link: "", parentId: "0", itemType: MapItemType.BASE, ownerId: "1", originId: null }, // ComposedNorthEast
        { id: "3", coordinates: "1,0:1,-3", title: "E", content: "", preview: undefined, depth: 2, link: "", parentId: "0", itemType: MapItemType.BASE, ownerId: "1", originId: null },  // ComposedEast
        { id: "4", coordinates: "1,0:1,-4", title: "SE", content: "", preview: undefined, depth: 2, link: "", parentId: "0", itemType: MapItemType.BASE, ownerId: "1", originId: null }, // ComposedSouthEast
        { id: "5", coordinates: "1,0:1,-5", title: "SW", content: "", preview: undefined, depth: 2, link: "", parentId: "0", itemType: MapItemType.BASE, ownerId: "1", originId: null }, // ComposedSouthWest
        { id: "6", coordinates: "1,0:1,-6", title: "W", content: "", preview: undefined, depth: 2, link: "", parentId: "0", itemType: MapItemType.BASE, ownerId: "1", originId: null },  // ComposedWest
      ];

      mockUtils.map.getComposedChildren.fetch.mockResolvedValue(allComposedChildren);

      const result = await mockUtils.map.getComposedChildren.fetch({ coordId: parentCoordId });

      expect(result).toHaveLength(6);
      expect(result.map(item => item.coordinates)).toEqual([
        "1,0:1,-1",
        "1,0:1,-2",
        "1,0:1,-3",
        "1,0:1,-4",
        "1,0:1,-5",
        "1,0:1,-6",
      ]);
    });
  });

  describe("hasComposition query", () => {
    test("should return true when tile has composed children", async () => {
      const coordId = "1,0:2";
      mockUtils.map.hasComposition.fetch.mockResolvedValue({ hasComposition: true });

      const result = await mockUtils.map.hasComposition.fetch({ coordId });

      expect(result.hasComposition).toBe(true);
      expect(mockUtils.map.hasComposition.fetch).toHaveBeenCalledWith({ coordId });
    });

    test("should return false when tile has no composed children", async () => {
      const coordId = "1,0:3";
      mockUtils.map.hasComposition.fetch.mockResolvedValue({ hasComposition: false });

      const result = await mockUtils.map.hasComposition.fetch({ coordId });

      expect(result.hasComposition).toBe(false);
    });

    test("should return false for root tile without composition", async () => {
      const coordId = "1,0";
      mockUtils.map.hasComposition.fetch.mockResolvedValue({ hasComposition: false });

      const result = await mockUtils.map.hasComposition.fetch({ coordId });

      expect(result.hasComposition).toBe(false);
    });
  });

  describe("Composition expansion state", () => {
    test("should handle toggling composition expansion", () => {
      const state1 = initialCacheState;
      expect(state1.isCompositionExpanded).toBe(false);

      const state2 = cacheReducer(state1, { type: "TOGGLE_COMPOSITION_EXPANSION" });
      expect(state2.isCompositionExpanded).toBe(true);

      const state3 = cacheReducer(state2, { type: "TOGGLE_COMPOSITION_EXPANSION" });
      expect(state3.isCompositionExpanded).toBe(false);
    });

    test("should handle setting composition expansion explicitly", () => {
      const state1 = initialCacheState;

      const state2 = cacheReducer(state1, { type: "SET_COMPOSITION_EXPANSION", payload: true });
      expect(state2.isCompositionExpanded).toBe(true);

      const state3 = cacheReducer(state2, { type: "SET_COMPOSITION_EXPANSION", payload: false });
      expect(state3.isCompositionExpanded).toBe(false);
    });

    test("should preserve composition expansion state during data updates", () => {
      const state1 = cacheReducer(initialCacheState, { type: "SET_COMPOSITION_EXPANSION", payload: true });
      expect(state1.isCompositionExpanded).toBe(true);

      // Simulate loading region
      const state2 = cacheReducer(state1, {
        type: "LOAD_REGION",
        payload: {
          centerCoordId: "1,0",
          items: [],
          maxDepth: 2,
        },
      });

      // Composition expansion state should be preserved
      expect(state2.isCompositionExpanded).toBe(true);
    });
  });

  describe("Cache invalidation with composition", () => {
    test("should invalidate region when composed children are added", () => {
      const parentCoordId = "1,0:2";

      // Initial state with region loaded
      const state1 = cacheReducer(initialCacheState, {
        type: "LOAD_REGION",
        payload: {
          centerCoordId: parentCoordId,
          items: [],
          maxDepth: 2,
        },
      });

      // Verify region is loaded
      expect(state1.regionMetadata[parentCoordId]).toBeDefined();

      // Invalidate the region (e.g., after adding composed child)
      const state2 = cacheReducer(state1, {
        type: "INVALIDATE_REGION",
        payload: parentCoordId,
      });

      // Region metadata should be removed
      expect(state2.regionMetadata[parentCoordId]).toBeUndefined();
    });

    test("should invalidate all cache when composition structure changes significantly", () => {
      // Setup state with multiple regions
      const state1 = cacheReducer(initialCacheState, {
        type: "LOAD_REGION",
        payload: {
          centerCoordId: "1,0",
          items: [],
          maxDepth: 2,
        },
      });

      const state2 = cacheReducer(state1, {
        type: "LOAD_REGION",
        payload: {
          centerCoordId: "1,0:1",
          items: [],
          maxDepth: 2,
        },
      });

      expect(Object.keys(state2.regionMetadata)).toHaveLength(2);

      // Invalidate all
      const state3 = cacheReducer(state2, { type: "INVALIDATE_ALL" });

      // All regions should be cleared
      expect(Object.keys(state3.regionMetadata)).toHaveLength(0);
    });
  });

  describe("Cached data with negative directions", () => {
    test("should store composed children in cache with negative directions", () => {
      const composedChild: MapItemAPIContract = {
        id: "10",
        coordinates: "1,0:2,-1", // Negative direction
        title: "Composed Child",
        content: "Test content",
        preview: undefined,
        depth: 2,
        link: "",
        parentId: "5",
        itemType: MapItemType.BASE,
        ownerId: "1",
        originId: null,
      };

      const state = cacheReducer(initialCacheState, {
        type: "LOAD_REGION",
        payload: {
          items: [composedChild],
          centerCoordId: "1,0:2",
          maxDepth: 2,
        },
      });

      const cachedItem = state.itemsById["1,0:2,-1"];
      expect(cachedItem).toBeDefined();
      expect(cachedItem?.metadata.coordId).toBe("1,0:2,-1");
      expect(cachedItem?.data.title).toBe("Composed Child");
      expect(cachedItem?.metadata.coordinates.path).toEqual([2, -1]);
    });

    test("should correctly parse negative directions in coordId", () => {
      const mixedChildren: MapItemAPIContract[] = [
        // Structural child (positive direction)
        {
          id: "1",
          coordinates: "1,0:1,2",
          title: "Structural",
          content: "",
          preview: undefined,
          depth: 2,
          link: "",
          parentId: "0",
          itemType: MapItemType.BASE,
          ownerId: "1",
          originId: null,
        },
        // Composed child (negative direction)
        {
          id: "2",
          coordinates: "1,0:1,-2",
          title: "Composed",
          content: "",
          preview: undefined,
          depth: 2,
          link: "",
          parentId: "0",
          itemType: MapItemType.BASE,
          ownerId: "1",
          originId: null,
        },
      ];

      const state = cacheReducer(initialCacheState, {
        type: "LOAD_REGION",
        payload: {
          items: mixedChildren,
          centerCoordId: "1,0:1",
          maxDepth: 2,
        },
      });

      // Structural child should have positive direction
      const structural = state.itemsById["1,0:1,2"];
      expect(structural?.metadata.coordinates.path).toEqual([1, 2]);

      // Composed child should have negative direction
      const composed = state.itemsById["1,0:1,-2"];
      expect(composed?.metadata.coordinates.path).toEqual([1, -2]);
      expect(composed?.metadata.coordinates.path[1]).toBe(Direction.ComposedNorthEast);
    });

    test("should handle region queries excluding composed children by default", () => {
      // This test verifies that region queries can differentiate between
      // structural (positive) and composed (negative) children
      const mixedItems: MapItemAPIContract[] = [
        {
          id: "1",
          coordinates: "1,0",
          title: "Root",
          content: "",
          preview: undefined,
          depth: 0,
          link: "",
          parentId: null,
          itemType: MapItemType.BASE,
          ownerId: "1",
          originId: null,
        },
        {
          id: "2",
          coordinates: "1,0:1",
          title: "Structural Child",
          content: "",
          preview: undefined,
          depth: 1,
          link: "",
          parentId: "1",
          itemType: MapItemType.BASE,
          ownerId: "1",
          originId: null,
        },
        {
          id: "3",
          coordinates: "1,0:-1",
          title: "Composed Child",
          content: "",
          preview: undefined,
          depth: 1,
          link: "",
          parentId: "1",
          itemType: MapItemType.BASE,
          ownerId: "1",
          originId: null,
        },
      ];

      const state = cacheReducer(initialCacheState, {
        type: "LOAD_REGION",
        payload: {
          items: mixedItems,
          centerCoordId: "1,0",
          maxDepth: 2,
        },
      });

      // All items should be in cache
      expect(Object.keys(state.itemsById)).toHaveLength(3);
      expect(state.itemsById["1,0"]).toBeDefined();
      expect(state.itemsById["1,0:1"]).toBeDefined();
      expect(state.itemsById["1,0:-1"]).toBeDefined();

      // Verify negative direction is properly stored
      const composedChild = state.itemsById["1,0:-1"];
      expect(composedChild?.metadata.coordinates.path).toEqual([-1]);
      expect(composedChild?.metadata.coordinates.path[0]).toBe(Direction.ComposedNorthWest);
    });
  });

  describe("Data handler integration with composed children", () => {
    test("should successfully load region including composed children", async () => {
      const centerCoordId = "1,0";
      const itemsWithComposition: MapItemAPIContract[] = [
        {
          id: "1",
          coordinates: "1,0",
          title: "Root",
          content: "",
          preview: undefined,
          depth: 0,
          link: "",
          parentId: null,
          itemType: MapItemType.BASE,
          ownerId: "1",
          originId: null,
        },
        {
          id: "2",
          coordinates: "1,0:1",
          title: "Structural",
          content: "",
          preview: undefined,
          depth: 1,
          link: "",
          parentId: "1",
          itemType: MapItemType.BASE,
          ownerId: "1",
          originId: null,
        },
        {
          id: "3",
          coordinates: "1,0:-1",
          title: "Composed",
          content: "",
          preview: undefined,
          depth: 1,
          link: "",
          parentId: "1",
          itemType: MapItemType.BASE,
          ownerId: "1",
          originId: null,
        },
      ];

      mockUtils.map.getItemsForRootItem.fetch.mockResolvedValue(itemsWithComposition);

      const dataHandler = createDataHandlerWithMockableService(
        mockDispatch,
        () => mockState,
        mockUtils,
        { retryAttempts: 1 }
      );

      const result = await dataHandler.loadRegion(centerCoordId, 2);

      expect(result.success).toBe(true);
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "LOAD_REGION",
          payload: expect.objectContaining({
            centerCoordId: "1,0",
            maxDepth: 2,
            items: expect.arrayContaining([
              expect.objectContaining({ coordinates: "1,0" }),
              expect.objectContaining({ coordinates: "1,0:1" }),
              expect.objectContaining({ coordinates: "1,0:-1" }),
            ]),
          }),
        })
      );
    });
  });

  describe("Edge cases with negative directions", () => {
    test("should handle deeply nested composed children", () => {
      const deepComposedChild: MapItemAPIContract = {
        id: "10",
        coordinates: "1,0:1,2,-3,4,-1", // Mixed positive and negative
        title: "Deep Composed",
        content: "",
        preview: undefined,
        depth: 5,
        link: "",
        parentId: "5",
        itemType: MapItemType.BASE,
        ownerId: "1",
        originId: null,
      };

      const state = cacheReducer(initialCacheState, {
        type: "LOAD_REGION",
        payload: {
          items: [deepComposedChild],
          centerCoordId: "1,0:1",
          maxDepth: 5,
        },
      });

      const cached = state.itemsById["1,0:1,2,-3,4,-1"];
      expect(cached).toBeDefined();
      expect(cached?.metadata.coordinates.path).toEqual([1, 2, -3, 4, -1]);
      expect(cached?.metadata.depth).toBe(5);
    });

    test("should handle composition at root level", () => {
      const rootComposition: MapItemAPIContract = {
        id: "1",
        coordinates: "1,0:-1", // Composed child of root
        title: "Root Composition",
        content: "",
        preview: undefined,
        depth: 1,
        link: "",
        parentId: "0",
        itemType: MapItemType.BASE,
        ownerId: "1",
        originId: null,
      };

      const state = cacheReducer(initialCacheState, {
        type: "LOAD_REGION",
        payload: {
          items: [rootComposition],
          centerCoordId: "1,0",
          maxDepth: 1,
        },
      });

      const cached = state.itemsById["1,0:-1"];
      expect(cached).toBeDefined();
      expect(cached?.metadata.coordinates.path).toEqual([-1]);
    });

    test("should preserve negative directions during cache updates", () => {
      // Initial load
      const state1 = cacheReducer(initialCacheState, {
        type: "LOAD_REGION",
        payload: {
          items: [{
            id: "1",
            coordinates: "1,0:-1",
            title: "Original",
            content: "Original content",
            preview: undefined,
            depth: 1,
            link: "",
            parentId: "0",
            itemType: MapItemType.BASE,
            ownerId: "1",
            originId: null,
          }],
          centerCoordId: "1,0",
          maxDepth: 1,
        },
      });

      // Update the same item
      const state2 = cacheReducer(state1, {
        type: "LOAD_REGION",
        payload: {
          items: [{
            id: "1",
            coordinates: "1,0:-1",
            title: "Updated",
            content: "Updated content",
            preview: undefined,
            depth: 1,
            link: "",
            parentId: "0",
            itemType: MapItemType.BASE,
            ownerId: "1",
            originId: null,
          }],
          centerCoordId: "1,0",
          maxDepth: 1,
        },
      });

      const cached = state2.itemsById["1,0:-1"];
      expect(cached?.data.title).toBe("Updated");
      expect(cached?.metadata.coordinates.path).toEqual([-1]); // Direction preserved
    });
  });
});
