import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createDataHandler,
  createDataHandlerWithMockableService,
} from "~/app/map/Cache/Handlers/data-handler";
import { cacheActions } from "~/app/map/Cache/State/actions";
import { initialCacheState } from "~/app/map/Cache/State/reducer";
import type { DataHandlerConfig, DataHandlerServices } from "~/app/map/Cache/Handlers/data-handler";
import type { CacheState } from "~/app/map/Cache/State/types";
import type { MapItemAPIContract } from "~/server/api/types/contracts";
import { MapItemType } from "~/lib/domains/mapping/utils";

// Mock console.warn to avoid noise in tests (restored after each test)
vi.spyOn(console, 'warn').mockImplementation(() => {
  // Intentionally empty to silence warnings in tests
});

describe("Data Handler", () => {
  let mockDispatch: ReturnType<typeof vi.fn>;
  let mockUtils: {
    map: {
      getItemsForRootItem: {
        fetch: ReturnType<typeof vi.fn>;
      };
      getItemByCoords: {
        fetch: ReturnType<typeof vi.fn>;
      };
      getRootItemById: {
        fetch: ReturnType<typeof vi.fn>;
      };
      getDescendants: {
        fetch: ReturnType<typeof vi.fn>;
      };
    };
  };
  let mockServices: DataHandlerServices;
  let mockState: CacheState;
  let config: DataHandlerConfig;

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
    },
  ];

  beforeEach(() => {
    mockDispatch = vi.fn();

    // Mock tRPC utils for the new pure service approach
    mockUtils = {
      map: {
        getItemsForRootItem: {
          fetch: vi.fn().mockResolvedValue(mockItems),
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
      },
    };

    // Legacy service mock for backwards compatibility tests
    mockServices = {
      server: {
        fetchItemsForCoordinate: vi.fn().mockResolvedValue(mockItems),
      },
    };

    mockState = {
      ...initialCacheState,
      cacheConfig: {
        maxAge: 300000,
        backgroundRefreshInterval: 30000,
        enableOptimisticUpdates: true,
        maxDepth: 3,
      },
    };

    config = {
      dispatch: mockDispatch,
      services: mockServices,
      getState: () => mockState,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("loadRegion", () => {
    test("loads region when no metadata exists", async () => {
      const handler = createDataHandler(config);

      await handler.loadRegion("1,2", 2);

      expect(mockServices.server.fetchItemsForCoordinate).toHaveBeenCalledWith({
        centerCoordId: "1,2",
        maxDepth: 2,
      });
      expect(mockDispatch).toHaveBeenCalledWith(cacheActions.setLoading(true));
      expect(mockDispatch).toHaveBeenCalledWith(
        cacheActions.loadRegion(mockItems, "1,2", 2),
      );
      expect(mockDispatch).toHaveBeenCalledWith(cacheActions.setLoading(false));
    });

    test("loads region when metadata is stale", async () => {
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

      const handler = createDataHandler({
        ...config,
        getState: () => staleState,
      });

      await handler.loadRegion("1,2", 2);

      expect(mockServices.server.fetchItemsForCoordinate).toHaveBeenCalled();
    });

    test("loads region when required depth is higher", async () => {
      const lowDepthState: CacheState = {
        ...mockState,
        regionMetadata: {
          "1,2": {
            centerCoordId: "1,2",
            maxDepth: 1, // Lower than requested depth
            loadedAt: Date.now(),
            itemCoordIds: ["1,2"],
          },
        },
      };

      const handler = createDataHandler({
        ...config,
        getState: () => lowDepthState,
      });

      await handler.loadRegion("1,2", 3);

      expect(mockServices.server.fetchItemsForCoordinate).toHaveBeenCalled();
    });

    test("does not load when region is fresh and has sufficient depth", async () => {
      const freshState: CacheState = {
        ...mockState,
        regionMetadata: {
          "1,2": {
            centerCoordId: "1,2",
            maxDepth: 3,
            loadedAt: Date.now(),
            itemCoordIds: ["1,2"],
          },
        },
      };

      const handler = createDataHandler({
        ...config,
        getState: () => freshState,
      });

      await handler.loadRegion("1,2", 2);

      expect(
        mockServices.server.fetchItemsForCoordinate,
      ).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    test("handles server errors gracefully", async () => {
      const serverError = new Error("Server error");
      mockServices.server.fetchItemsForCoordinate = vi
        .fn()
        .mockRejectedValue(serverError);

      const handler = createDataHandler(config);

      await handler.loadRegion("1,2", 2);

      expect(mockDispatch).toHaveBeenCalledWith(cacheActions.setLoading(true));
      expect(mockDispatch).toHaveBeenCalledWith(
        cacheActions.setError(serverError),
      );
      expect(mockDispatch).toHaveBeenCalledWith(cacheActions.setLoading(false));
    });

    test("uses default maxDepth from state config", async () => {
      const handler = createDataHandler(config);

      await handler.loadRegion("1,2");

      expect(mockDispatch).toHaveBeenCalledWith(
        cacheActions.loadRegion(mockItems, "1,2", 3),
      );
    });
  });

  describe("loadItemChildren", () => {
    test("loads item children successfully", async () => {
      const handler = createDataHandler(config);

      await handler.loadItemChildren("1,2", 2);

      expect(mockServices.server.fetchItemsForCoordinate).toHaveBeenCalledWith({
        centerCoordId: "1,2",
        maxDepth: 2,
      });
      expect(mockDispatch).toHaveBeenCalledWith(cacheActions.setLoading(true));
      expect(mockDispatch).toHaveBeenCalledWith(
        cacheActions.loadItemChildren(mockItems, "1,2", 2),
      );
      expect(mockDispatch).toHaveBeenCalledWith(cacheActions.setLoading(false));
    });

    test("handles errors in loadItemChildren", async () => {
      const serverError = new Error("Children load error");
      mockServices.server.fetchItemsForCoordinate = vi
        .fn()
        .mockRejectedValue(serverError);

      const handler = createDataHandler(config);

      await handler.loadItemChildren("1,2", 2);

      expect(mockDispatch).toHaveBeenCalledWith(
        cacheActions.setError(serverError),
      );
      expect(mockDispatch).toHaveBeenCalledWith(cacheActions.setLoading(false));
    });

    test("uses default maxDepth of 2 for children", async () => {
      const handler = createDataHandler(config);

      await handler.loadItemChildren("1,2");

      expect(mockDispatch).toHaveBeenCalledWith(
        cacheActions.loadItemChildren(mockItems, "1,2", 2),
      );
    });
  });

  describe("prefetchRegion", () => {
    test("prefetches region without loading state", async () => {
      const handler = createDataHandler(config);

      await handler.prefetchRegion("1,2");

      expect(mockServices.server.fetchItemsForCoordinate).toHaveBeenCalledWith({
        centerCoordId: "1,2",
        maxDepth: 3,
      });
      expect(mockDispatch).toHaveBeenCalledWith(
        cacheActions.loadRegion(mockItems, "1,2", 3),
      );
      // Should NOT dispatch loading states
      expect(mockDispatch).not.toHaveBeenCalledWith(
        cacheActions.setLoading(true),
      );
      expect(mockDispatch).not.toHaveBeenCalledWith(
        cacheActions.setLoading(false),
      );
    });

    test("handles prefetch errors silently", async () => {
      const serverError = new Error("Prefetch error");
      mockServices.server.fetchItemsForCoordinate = vi
        .fn()
        .mockRejectedValue(serverError);

      const handler = createDataHandler(config);

      await handler.prefetchRegion("1,2");

      // Should not dispatch error actions for prefetch
      expect(mockDispatch).not.toHaveBeenCalledWith(
        cacheActions.setError(serverError),
      );
      // Should log warning
      expect(console.warn).toHaveBeenCalledWith(
        "Prefetch failed:",
        serverError,
      );
    });
  });

  describe("invalidation methods", () => {
    test("invalidateRegion dispatches correct action", () => {
      const handler = createDataHandler(config);

      handler.invalidateRegion("test-region");

      expect(mockDispatch).toHaveBeenCalledWith(
        cacheActions.invalidateRegion("test-region"),
      );
    });

    test("invalidateAll dispatches correct action", () => {
      const handler = createDataHandler(config);

      handler.invalidateAll();

      expect(mockDispatch).toHaveBeenCalledWith(cacheActions.invalidateAll());
    });
  });

  describe("coordinate-based loading", () => {
    test("loads from specific coordinate (not root)", async () => {
      const handler = createDataHandler(config);

      await handler.loadRegion("5,10", 1);

      expect(mockServices.server.fetchItemsForCoordinate).toHaveBeenCalledWith({
        centerCoordId: "5,10",
        maxDepth: 1,
      });
    });

    test("loads from complex coordinate paths correctly", async () => {
      const handler = createDataHandler(config);

      // This should load items relative to the specific sub-item at path [3,4]
      // not from the root of user 1, group 2
      await handler.loadRegion("1,2:3,4", 2);

      expect(mockServices.server.fetchItemsForCoordinate).toHaveBeenCalledWith({
        centerCoordId: "1,2:3,4",
        maxDepth: 2,
      });
    });

    test("maintains coordinate specificity for prefetching", async () => {
      const handler = createDataHandler(config);

      await handler.prefetchRegion("7,8:1,2,3");

      expect(mockServices.server.fetchItemsForCoordinate).toHaveBeenCalledWith({
        centerCoordId: "7,8:1,2,3",
        maxDepth: 3,
      });
    });
  });

  describe("handler creation", () => {
    test("returns all expected methods", () => {
      const handler = createDataHandler(config);

      expect(handler).toHaveProperty("loadRegion");
      expect(handler).toHaveProperty("loadItemChildren");
      expect(handler).toHaveProperty("prefetchRegion");
      expect(handler).toHaveProperty("invalidateRegion");
      expect(handler).toHaveProperty("invalidateAll");

      expect(typeof handler.loadRegion).toBe("function");
      expect(typeof handler.loadItemChildren).toBe("function");
      expect(typeof handler.prefetchRegion).toBe("function");
      expect(typeof handler.invalidateRegion).toBe("function");
      expect(typeof handler.invalidateAll).toBe("function");
    });
  });

  describe("Pure service factory approach", () => {
    test("createDataHandlerWithMockableService works with mock utils", async () => {
      const handler = createDataHandlerWithMockableService(
        mockDispatch,
        () => mockState,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
        mockUtils as any,
        { retryAttempts: 1 },
      );

      await handler.loadRegion("1,2", 2);

      expect(mockUtils.map.getItemsForRootItem.fetch).toHaveBeenCalledWith({
        userId: 1,
        groupId: 2,
      });
      expect(mockDispatch).toHaveBeenCalledWith(cacheActions.setLoading(true));
      expect(mockDispatch).toHaveBeenCalledWith(
        cacheActions.loadRegion(mockItems, "1,2", 2),
      );
      expect(mockDispatch).toHaveBeenCalledWith(cacheActions.setLoading(false));
    });

    test("pure service approach handles errors correctly", async () => {
      const serverError = new Error("Service error");
      mockUtils.map.getItemsForRootItem.fetch.mockRejectedValue(serverError);

      const handler = createDataHandlerWithMockableService(
        mockDispatch,
        () => mockState,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
        mockUtils as any,
        { enableRetry: false },
      );

      await handler.loadRegion("1,2", 2);

      expect(mockDispatch).toHaveBeenCalledWith(cacheActions.setLoading(true));
      // When there's an error, it dispatches setError with a NetworkError wrapper
      expect(mockDispatch).toHaveBeenCalledWith(
        cacheActions.setError(expect.objectContaining({
          message: "Server request failed",
          code: "NETWORK_ERROR",
          originalError: serverError,
        }) as Error),
      );
      expect(mockDispatch).toHaveBeenCalledWith(cacheActions.setLoading(false));
    });
  });
});
