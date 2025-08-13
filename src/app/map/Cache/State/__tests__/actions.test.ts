import {
  loadRegion,
  loadItemChildren,
  setCenter,
  setExpandedItems,
  toggleItemExpansion,
  setLoading,
  setError,
  invalidateRegion,
  invalidateAll,
  updateCacheConfig,
  cacheActions,
  createLoadRegionAction,
  createLoadItemChildrenAction,
  createSetCenterAction,
  createOptimisticUpdateActions,
  createErrorHandlingActions,
  createBatchActions,
} from "../actions";
import { ACTION_TYPES } from "../types";
import type { MapItemAPIContract } from "~/server/api/types/contracts";
import type { CacheAction, CacheState } from "../types";
import { MapItemType } from "~/lib/domains/mapping/types";

describe("Cache Actions", () => {
  // Mock data for testing
  const mockItems: MapItemAPIContract[] = [
    {
      id: "1",
      coordinates: "1,2",
      name: "Test Item",
      descr: "Test Description",
      depth: 1,
      url: "",
      parentId: null,
      itemType: MapItemType.BASE,
      ownerId: "test-owner",
    },
  ];

  describe("Basic Action Creators", () => {
    test("loadRegion creates correct action", () => {
      const result = loadRegion(mockItems, "1,2", 3);

      expect(result).toEqual({
        type: ACTION_TYPES.LOAD_REGION,
        payload: {
          items: mockItems,
          centerCoordId: "1,2",
          maxDepth: 3,
        },
      });
    });

    test("loadItemChildren creates correct action", () => {
      const result = loadItemChildren(mockItems, "1,2", 2);

      expect(result).toEqual({
        type: ACTION_TYPES.LOAD_ITEM_CHILDREN,
        payload: {
          items: mockItems,
          parentCoordId: "1,2",
          maxDepth: 2,
        },
      });
    });

    test("setCenter creates correct action", () => {
      const result = setCenter("1,2");

      expect(result).toEqual({
        type: ACTION_TYPES.SET_CENTER,
        payload: "1,2",
      });
    });

    test("setExpandedItems creates correct action", () => {
      const itemIds = ["1", "2", "3"];
      const result = setExpandedItems(itemIds);

      expect(result).toEqual({
        type: ACTION_TYPES.SET_EXPANDED_ITEMS,
        payload: itemIds,
      });
    });

    test("toggleItemExpansion creates correct action", () => {
      const result = toggleItemExpansion("1");

      expect(result).toEqual({
        type: ACTION_TYPES.TOGGLE_ITEM_EXPANSION,
        payload: "1",
      });
    });

    test("setLoading creates correct action", () => {
      const result = setLoading(true);

      expect(result).toEqual({
        type: ACTION_TYPES.SET_LOADING,
        payload: true,
      });
    });

    test("setError creates correct action", () => {
      const error = new Error("Test error");
      const result = setError(error);

      expect(result).toEqual({
        type: ACTION_TYPES.SET_ERROR,
        payload: error,
      });
    });

    test("setError with null creates correct action", () => {
      const result = setError(null);

      expect(result).toEqual({
        type: ACTION_TYPES.SET_ERROR,
        payload: null,
      });
    });

    test("invalidateRegion creates correct action", () => {
      const result = invalidateRegion("region-key");

      expect(result).toEqual({
        type: ACTION_TYPES.INVALIDATE_REGION,
        payload: "region-key",
      });
    });

    test("invalidateAll creates correct action", () => {
      const result = invalidateAll();

      expect(result).toEqual({
        type: ACTION_TYPES.INVALIDATE_ALL,
      });
    });

    test("updateCacheConfig creates correct action", () => {
      const config = { maxAge: 5000, enableOptimisticUpdates: false };
      const result = updateCacheConfig(config);

      expect(result).toEqual({
        type: ACTION_TYPES.UPDATE_CACHE_CONFIG,
        payload: config,
      });
    });
  });

  describe("Action Creators are Pure Functions", () => {
    test("loadRegion returns same output for same input", () => {
      const result1 = loadRegion(mockItems, "1,2", 3);
      const result2 = loadRegion(mockItems, "1,2", 3);

      expect(result1).toEqual(result2);
    });

    test("action creators do not mutate input", () => {
      const originalItems = [...mockItems];
      const originalItemIds = ["1", "2"];

      loadRegion(mockItems, "1,2", 3);
      setExpandedItems(originalItemIds);

      expect(mockItems).toEqual(originalItems);
      expect(originalItemIds).toEqual(["1", "2"]);
    });

    test("action creators are deterministic", () => {
      const results = Array.from({ length: 5 }, () => setCenter("1,2"));

      results.forEach((result) => {
        expect(result).toEqual({
          type: ACTION_TYPES.SET_CENTER,
          payload: "1,2",
        });
      });
    });
  });

  describe("Grouped Action Creators", () => {
    test("cacheActions contains all action creators", () => {
      expect(cacheActions).toHaveProperty("loadRegion");
      expect(cacheActions).toHaveProperty("loadItemChildren");
      expect(cacheActions).toHaveProperty("setCenter");
      expect(cacheActions).toHaveProperty("setExpandedItems");
      expect(cacheActions).toHaveProperty("toggleItemExpansion");
      expect(cacheActions).toHaveProperty("setLoading");
      expect(cacheActions).toHaveProperty("setError");
      expect(cacheActions).toHaveProperty("invalidateRegion");
      expect(cacheActions).toHaveProperty("invalidateAll");
      expect(cacheActions).toHaveProperty("updateCacheConfig");
    });

    test("cacheActions functions work correctly", () => {
      const result = cacheActions.setCenter("test");
      expect(result).toEqual(setCenter("test"));
    });
  });

  describe("Validated Action Creators", () => {
    test("createLoadRegionAction validates payload", () => {
      const validPayload = {
        items: mockItems,
        centerCoordId: "1,2",
        maxDepth: 3,
      };

      const result = createLoadRegionAction(validPayload);
      expect(result.type).toBe(ACTION_TYPES.LOAD_REGION);
    });

    test("createLoadRegionAction throws on invalid centerCoordId", () => {
      const invalidPayload = {
        items: mockItems,
        centerCoordId: "",
        maxDepth: 3,
      };

      expect(() => createLoadRegionAction(invalidPayload)).toThrow(
        "Invalid payload for LOAD_REGION action",
      );
    });

    test("createLoadRegionAction throws on negative maxDepth", () => {
      const invalidPayload = {
        items: mockItems,
        centerCoordId: "1,2",
        maxDepth: -1,
      };

      expect(() => createLoadRegionAction(invalidPayload)).toThrow(
        "Invalid payload for LOAD_REGION action",
      );
    });

    test("createLoadItemChildrenAction validates payload", () => {
      const validPayload = {
        items: mockItems,
        parentCoordId: "1,2",
        maxDepth: 2,
      };

      const result = createLoadItemChildrenAction(validPayload);
      expect(result.type).toBe(ACTION_TYPES.LOAD_ITEM_CHILDREN);
    });

    test("createLoadItemChildrenAction throws on invalid parentCoordId", () => {
      const invalidPayload = {
        items: mockItems,
        parentCoordId: "",
        maxDepth: 2,
      };

      expect(() => createLoadItemChildrenAction(invalidPayload)).toThrow(
        "Invalid payload for LOAD_ITEM_CHILDREN action",
      );
    });

    test("createSetCenterAction validates centerCoordId", () => {
      const result = createSetCenterAction("1,2");
      expect(result.type).toBe(ACTION_TYPES.SET_CENTER);
    });

    test("createSetCenterAction throws on empty centerCoordId", () => {
      expect(() => createSetCenterAction("")).toThrow(
        "Invalid centerCoordId for SET_CENTER action",
      );
    });

    test("createSetCenterAction throws on whitespace-only centerCoordId", () => {
      expect(() => createSetCenterAction("   ")).toThrow(
        "Invalid centerCoordId for SET_CENTER action",
      );
    });
  });

  describe("Helper Action Creators", () => {
    test("createOptimisticUpdateActions returns correct actions", () => {
      const result = createOptimisticUpdateActions("1,2", mockItems[0]!);

      expect(result).toHaveLength(2);
      expect(result[0]!.type).toBe(ACTION_TYPES.LOAD_REGION);
      expect(result[1]!.type).toBe(ACTION_TYPES.SET_LOADING);
      expect(
        (result[1] as { type: "SET_LOADING"; payload: boolean }).payload,
      ).toBe(false);
    });

    test("createErrorHandlingActions returns correct actions", () => {
      const error = new Error("Test error");
      const result = createErrorHandlingActions(error);

      expect(result).toHaveLength(2);
      expect(result[0]!.type).toBe(ACTION_TYPES.SET_ERROR);
      expect(result[1]!.type).toBe(ACTION_TYPES.SET_LOADING);
      expect(
        (result[0] as { type: "SET_ERROR"; payload: Error | null }).payload,
      ).toBe(error);
      expect(
        (result[1] as { type: "SET_LOADING"; payload: boolean }).payload,
      ).toBe(false);
    });

    test("createBatchActions filters out null/undefined", () => {
      const actions = [
        setCenter("1,2"),
        null as unknown as CacheAction,
        setLoading(true),
        undefined as unknown as CacheAction,
        setError(null),
      ];

      const result = createBatchActions(...actions);

      expect(result).toHaveLength(3);
      expect(result[0]!.type).toBe(ACTION_TYPES.SET_CENTER);
      expect(result[1]!.type).toBe(ACTION_TYPES.SET_LOADING);
      expect(result[2]!.type).toBe(ACTION_TYPES.SET_ERROR);
    });

    test("createBatchActions returns empty array for all null/undefined", () => {
      const result = createBatchActions(null as unknown as CacheAction, undefined as unknown as CacheAction);
      expect(result).toHaveLength(0);
    });
  });

  describe("Edge Cases", () => {
    test("actions work with empty arrays", () => {
      const result = loadRegion([], "1,2", 0);
      // Type assertion for actions that have payload
      expect((result as { payload: { items: MapItemAPIContract[] } }).payload.items).toEqual(
        [],
      );
    });

    test("actions work with empty strings in arrays", () => {
      const result = setExpandedItems([""]);
      // Type assertion for actions that have payload
      expect((result as { payload: string[] }).payload).toEqual([""]);
    });

    test("updateCacheConfig works with partial config", () => {
      const partialConfig = { maxAge: 1000 };
      const result = updateCacheConfig(partialConfig);
      // Type assertion for actions that have payload
      expect((result as { payload: Partial<CacheState['cacheConfig']> }).payload).toEqual(partialConfig);
    });

    test("updateCacheConfig works with empty config", () => {
      const emptyConfig = {};
      const result = updateCacheConfig(emptyConfig);
      // Type assertion for actions that have payload
      expect((result as { payload: Partial<CacheState['cacheConfig']> }).payload).toEqual(emptyConfig);
    });
  });
});
