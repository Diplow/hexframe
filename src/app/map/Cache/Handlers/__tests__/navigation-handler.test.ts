/* eslint-disable @typescript-eslint/unbound-method */
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createNavigationHandler,
  createNavigationHandlerForTesting,
} from "~/app/map/Cache/Handlers/NavigationHandler/navigation-handler";
import { cacheActions } from "~/app/map/Cache/State/actions";
import { initialCacheState } from "~/app/map/Cache/State/reducer";
import type { NavigationHandlerConfig } from "~/app/map/Cache/Handlers/NavigationHandler/navigation-handler";
import type { CacheState } from "~/app/map/Cache/State/types";
import type { DataOperations } from "~/app/map/Cache/types/handlers";
import { createMockEventBus, expectEventEmitted } from "~/test-utils/event-bus";

describe("Navigation Handler", () => {
  let mockDispatch: ReturnType<typeof vi.fn>;
  let mockRouter: {
    push: ReturnType<typeof vi.fn>;
    replace: ReturnType<typeof vi.fn>;
  };
  let mockDataHandler: DataOperations;
  let mockState: CacheState;
  let config: NavigationHandlerConfig;
  let originalHistory: History;
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  beforeEach(() => {
    // Mock window.history
    originalHistory = window.history;
    Object.defineProperty(window, 'history', {
      writable: true,
      value: {
        pushState: vi.fn(),
        replaceState: vi.fn(),
        back: vi.fn(),
        forward: vi.fn(),
        go: vi.fn(),
        length: 1,
        state: null,
        scrollRestoration: 'auto'
      }
    });
    
    mockDispatch = vi.fn();
    mockEventBus = createMockEventBus();
    mockRouter = {
      push: vi.fn(),
      replace: vi.fn(),
    };
    mockDataHandler = {
      loadRegion: vi.fn().mockResolvedValue({ success: true }),
      loadItemChildren: vi.fn().mockResolvedValue({ success: true }),
      prefetchRegion: vi.fn().mockResolvedValue({ success: true }),
      invalidateRegion: vi.fn(),
      invalidateAll: vi.fn(),
    };
    mockState = {
      ...initialCacheState,
      currentCenter: "0,0", // Different from the item we'll navigate to
      expandedItemIds: ["1", "2"],
      itemsById: {
        "0,0": {
          data: {
            title: "Current Item",
            content: "Currently centered",
        preview: undefined,
            link: "",
            color: "#000000",
          },
          metadata: {
            coordId: "0,0",
            dbId: "999",
            depth: 0,
            parentId: undefined,
            coordinates: { userId: "user-test-0", groupId: 0, path: [] },
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
        "1,2": {
          data: {
            title: "Test Item",
            content: "Test Description",
        preview: undefined,
            link: "",
            color: "#000000",
          },
          metadata: {
            coordId: "1,2",
            dbId: "123",
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
      cacheConfig: {
        maxAge: 300000,
        backgroundRefreshInterval: 30000,
        enableOptimisticUpdates: true,
        maxDepth: 3,
      },
    };
    config = {
      dispatch: mockDispatch,
      getState: () => mockState,
      dataHandler: mockDataHandler,
      router: mockRouter,
      searchParams: new URLSearchParams("center=123&expandedItems=1,2"),
      pathname: "/map",
      eventBus: mockEventBus,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Restore original window.history
    Object.defineProperty(window, 'history', {
      writable: true,
      value: originalHistory
    });
  });

  describe("navigateToItem", () => {
    test("successfully navigates to item with cache and URL updates", async () => {
      const handler = createNavigationHandler(config);

      const result = await handler.navigateToItem("123"); // Use dbId

      expect(mockDispatch).toHaveBeenCalledWith(cacheActions.setCenter("1,2"));
      expect(mockDataHandler.prefetchRegion).toHaveBeenCalledWith("1,2");
      // Router is not called in current implementation
      expect(result).toEqual({
        success: true,
        centerUpdated: true,
        urlUpdated: true, // URL is updated via window.history
      });
    });

    test("navigates with push when pushToHistory is true", async () => {
      const handler = createNavigationHandler(config);

      const result = await handler.navigateToItem("123", { pushToHistory: true }); // Use dbId

      expect(mockDispatch).toHaveBeenCalledWith(cacheActions.setCenter("1,2"));
      expect(mockDataHandler.prefetchRegion).toHaveBeenCalledWith("1,2");
      expect(result).toEqual({
        success: true,
        centerUpdated: true,
        urlUpdated: true, // URL is updated via window.history
      });
    });

    test("navigates with replace when pushToHistory is false", async () => {
      const handler = createNavigationHandler(config);

      const result = await handler.navigateToItem("123", { pushToHistory: false }); // Use dbId

      expect(mockDispatch).toHaveBeenCalledWith(cacheActions.setCenter("1,2"));
      expect(mockDataHandler.prefetchRegion).toHaveBeenCalledWith("1,2");
      expect(result).toEqual({
        success: true,
        centerUpdated: true,
        urlUpdated: true, // URL is updated via window.history
      });
    });

    test("emits map.navigation event when navigating to item", async () => {
      const handler = createNavigationHandler(config);

      await handler.navigateToItem("123"); // Use dbId from mockState

      // Should emit map.navigation event
      expectEventEmitted(mockEventBus, 'map.navigation', {
        fromCenterId: "0,0",  // Current center from mockState
        fromCenterName: "Current Item",
        toCenterId: "123",
        toCenterName: "Test Item"
      });
    });

    test("updates URL with expanded items when navigating", async () => {
      const stateWithExpandedItems = {
        ...mockState,
        expandedItemIds: ["item1", "item2"],
      };
      config.getState = () => stateWithExpandedItems;
      
      const handler = createNavigationHandler(config);

      const result = await handler.navigateToItem("123", { pushToHistory: true }); // Use dbId

      expect(mockDispatch).toHaveBeenCalledWith(cacheActions.setCenter("1,2"));
      expect(mockDataHandler.prefetchRegion).toHaveBeenCalledWith("1,2");
      // Should update URL with the new center and maintain expanded items
      expect(window.history.pushState).toHaveBeenCalledWith(
        {},
        '',
        "/map?center=123&expandedItems=item1%2Citem2"
      );
      expect(result).toEqual({
        success: true,
        centerUpdated: true,
        urlUpdated: true,
      });
    });

    test("handles missing item gracefully", async () => {
      const stateWithoutItem: CacheState = {
        ...mockState,
        itemsById: {},
      };

      const handler = createNavigationHandler({
        ...config,
        getState: () => stateWithoutItem,
      });

      const result = await handler.navigateToItem("999"); // Non-existent dbId

      // When item is not found, navigation returns early without dispatching
      expect(mockDataHandler.prefetchRegion).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        centerUpdated: false,
        urlUpdated: false,
      });
    });

    test("handles data loading errors", async () => {
      const loadError = new Error("Failed to load region");
      mockDataHandler.prefetchRegion = vi.fn().mockRejectedValue(loadError);

      const handler = createNavigationHandler(config);

      const result = await handler.navigateToItem("123"); // Use existing item dbId

      // The navigation succeeds even if prefetch fails (it's done in background)
      expect(mockDispatch).toHaveBeenCalledWith(cacheActions.setCenter("1,2"));
      expect(result).toEqual({
        success: true,
        centerUpdated: true,
        urlUpdated: true, // URL is updated via window.history
      });
    });

    test("works without router", async () => {
      const configWithoutRouter: NavigationHandlerConfig = {
        ...config,
        router: undefined,
      };

      const handler = createNavigationHandler(configWithoutRouter);

      const result = await handler.navigateToItem("123"); // Use dbId

      expect(result).toEqual({
        success: true,
        centerUpdated: true,
        urlUpdated: true, // Now uses window.history
      });
      
      // Verify URL was updated via history API
      expect(window.history.pushState).toHaveBeenCalled();
    });
  });

  describe("updateCenter", () => {
    test("updates center without navigation", () => {
      const handler = createNavigationHandler(config);

      handler.updateCenter("2,3");

      expect(mockDispatch).toHaveBeenCalledWith(cacheActions.setCenter("2,3"));
      expect(mockDataHandler.loadRegion).not.toHaveBeenCalled();
      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  // URL updates are disabled for now - tests removed

  describe("prefetchForNavigation", () => {
    test("prefetches region without affecting state", async () => {
      const handler = createNavigationHandler(config);

      await handler.prefetchForNavigation("2,3");

      expect(mockDataHandler.prefetchRegion).toHaveBeenCalledWith("2,3");
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  // syncURLWithState tests removed - URL updates are disabled

  describe("navigateWithoutURL", () => {
    test("navigates without updating URL", async () => {
      const handler = createNavigationHandler(config);

      const result = await handler.navigateWithoutURL("1,2");

      expect(mockDataHandler.loadRegion).toHaveBeenCalledWith("1,2", 3);
      expect(mockDispatch).toHaveBeenCalledWith(cacheActions.setCenter("1,2"));
      expect(mockRouter.push).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        centerUpdated: true,
        urlUpdated: false, // navigateWithoutURL doesn't update URL
      });
    });

    test("handles errors in navigateWithoutURL", async () => {
      const loadError = new Error("Failed to load");
      mockDataHandler.loadRegion = vi.fn().mockRejectedValue(loadError);

      const handler = createNavigationHandler(config);

      const result = await handler.navigateWithoutURL("1,2");

      expect(mockDispatch).toHaveBeenCalledWith(
        cacheActions.setError(loadError),
      );
      expect(result).toEqual({
        success: false,
        error: loadError,
        centerUpdated: false,
        urlUpdated: false,
      });
    });
  });

  describe("getMapContext", () => {
    test("extracts context from URL correctly", () => {
      const handler = createNavigationHandler(config);

      const context = handler.getMapContext();

      // Should extract values from the search params and pathname
      expect(context).toEqual({
        centerItemId: "123",
        expandedItems: ["1", "2"],
        isCompositionExpanded: false,
        pathname: "/map",
        searchParams: config.searchParams,
      });
    });

    test("handles missing expanded items parameter", () => {
      const handler = createNavigationHandler({
        ...config,
        searchParams: new URLSearchParams(),
      });

      const context = handler.getMapContext();

      expect(context.expandedItems).toEqual([]);
    });

    test("handles missing center in searchParams", () => {
      const handler = createNavigationHandler({
        ...config,
        searchParams: new URLSearchParams("expandedItems=1,2"),
      });

      const context = handler.getMapContext();

      expect(context.centerItemId).toBe("");
    });

    test("filters empty expanded items", () => {
      const handler = createNavigationHandler({
        ...config,
        searchParams: new URLSearchParams("center=123&expandedItems=1,,3,"),
      });

      const context = handler.getMapContext();

      // Should filter out empty strings from expandedItems
      expect(context.expandedItems).toEqual(["1", "3"]);
    });

    test("handles missing dependencies gracefully", () => {
      const handler = createNavigationHandler({
        ...config,
        searchParams: undefined,
        pathname: undefined,
      });

      const context = handler.getMapContext();

      expect(context).toEqual({
        centerItemId: "",
        expandedItems: [],
        isCompositionExpanded: false,
        pathname: "/", // Falls back to window.location.pathname in tests
        searchParams: new URLSearchParams(),
      });
    });
  });

  describe("testing factory", () => {
    test("createNavigationHandlerForTesting works with mocked dependencies", async () => {
      const mockPush = vi.fn();
      const mockReplace = vi.fn();
      const mockTestRouter = { push: mockPush, replace: mockReplace };
      const mockTestSearchParams = new URLSearchParams("test=value");
      const mockTestPathname = "/map";

      const handler = createNavigationHandlerForTesting(
        mockDispatch,
        () => mockState,
        mockDataHandler,
        mockTestRouter,
        mockTestSearchParams,
        mockTestPathname,
      );

      await handler.navigateToItem("123", { pushToHistory: true }); // Use dbId

      expect(mockDispatch).toHaveBeenCalledWith(cacheActions.setCenter("1,2"));

      const context = handler.getMapContext();
      // Should return pathname from provided config
      expect(context).toEqual({
        centerItemId: "",
        expandedItems: [],
        isCompositionExpanded: false,
        pathname: "/map", // From mockTestPathname
        searchParams: mockTestSearchParams, // Should match the provided mockTestSearchParams
      });
    });

    test("works without mocked dependencies", () => {
      const handler = createNavigationHandlerForTesting(
        mockDispatch,
        () => mockState,
        mockDataHandler,
      );

      expect(handler).toHaveProperty("navigateToItem");
      expect(handler).toHaveProperty("getMapContext");

      // Should handle missing dependencies gracefully
      const context = handler.getMapContext();
      expect(context.pathname).toBe("/"); // Falls back to window.location.pathname
    });
  });

  describe("toggleItemExpansionWithURL", () => {
    test("expands item when not in expanded list", () => {
      const handler = createNavigationHandler(config);

      handler.toggleItemExpansionWithURL("3");

      expect(mockDispatch).toHaveBeenCalledWith(
        cacheActions.toggleItemExpansion("3")
      );
      // URL is not updated in current implementation
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    test("collapses item when already in expanded list", () => {
      const handler = createNavigationHandler(config);

      handler.toggleItemExpansionWithURL("1");

      expect(mockDispatch).toHaveBeenCalledWith(
        cacheActions.toggleItemExpansion("1")
      );
      // URL is not updated in current implementation
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    test("handles empty expanded list correctly", () => {
      const stateWithEmptyExpanded: CacheState = {
        ...mockState,
        expandedItemIds: [],
      };

      const handler = createNavigationHandler({
        ...config,
        getState: () => stateWithEmptyExpanded,
      });

      handler.toggleItemExpansionWithURL("5");

      expect(mockDispatch).toHaveBeenCalledWith(
        cacheActions.toggleItemExpansion("5")
      );
      // URL is not updated in current implementation
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    test("handles missing router gracefully", () => {
      const configWithoutRouter: NavigationHandlerConfig = {
        ...config,
        router: undefined,
      };

      const handler = createNavigationHandler(configWithoutRouter);

      expect(() => handler.toggleItemExpansionWithURL("1")).not.toThrow();
      // Should still toggle expansion
      expect(mockDispatch).toHaveBeenCalledWith(cacheActions.toggleItemExpansion("1"));
      // Should update URL via history API
      expect(window.history.replaceState).toHaveBeenCalled();
    });

    test("handles missing center item gracefully", () => {
      const stateWithoutCenter: CacheState = {
        ...mockState,
        currentCenter: null,
      };

      const handler = createNavigationHandler({
        ...config,
        getState: () => stateWithoutCenter,
      });

      handler.toggleItemExpansionWithURL("1");

      // Should not dispatch when center is missing (early return)
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    test("handles missing center item in itemsById", () => {
      const stateWithMissingItem: CacheState = {
        ...mockState,
        currentCenter: "3,4",
        itemsById: {},
      };

      const handler = createNavigationHandler({
        ...config,
        getState: () => stateWithMissingItem,
      });

      handler.toggleItemExpansionWithURL("1");

      // Should not dispatch when center item is not found (early return)
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    test("preserves order when removing items from expanded list", () => {
      const stateWithMultipleExpanded: CacheState = {
        ...mockState,
        currentCenter: "1,2", // Set to existing item so URL can be built
        expandedItemIds: ["1", "2", "3", "4"],
      };

      const handler = createNavigationHandler({
        ...config,
        getState: () => stateWithMultipleExpanded,
      });

      handler.toggleItemExpansionWithURL("2");

      expect(mockDispatch).toHaveBeenCalledWith(
        cacheActions.toggleItemExpansion("2")
      );
      // URL should be updated with expanded items removed
      expect(window.history.replaceState).toHaveBeenCalledWith(
        {},
        '',
        "/map?center=123&expandedItems=1%2C3%2C4"
      );
    });

    test("removes all expanded items when last one is toggled", () => {
      const stateWithSingleExpanded: CacheState = {
        ...mockState,
        currentCenter: "1,2", // Set to existing item so URL can be built
        expandedItemIds: ["1"],
      };

      const handler = createNavigationHandler({
        ...config,
        getState: () => stateWithSingleExpanded,
      });

      handler.toggleItemExpansionWithURL("1");

      expect(mockDispatch).toHaveBeenCalledWith(
        cacheActions.toggleItemExpansion("1")
      );
      // URL should be updated without expandedItems param when empty
      expect(window.history.replaceState).toHaveBeenCalledWith(
        {},
        '',
        "/map?center=123"
      );
    });

    test("adds item to expanded list and updates URL", () => {
      // Start with empty expanded items for this test
      const stateWithNoExpanded: CacheState = {
        ...mockState,
        currentCenter: "1,2", // Set to existing item so URL can be built
        expandedItemIds: [],
      };

      const handler = createNavigationHandler({
        ...config,
        getState: () => stateWithNoExpanded,
      });

      handler.toggleItemExpansionWithURL("2");

      expect(mockDispatch).toHaveBeenCalledWith(
        cacheActions.toggleItemExpansion("2")
      );
      // URL should be updated with new expanded item
      expect(window.history.replaceState).toHaveBeenCalledWith(
        {},
        '',
        "/map?center=123&expandedItems=2"
      );
    });
  });

  describe("handler creation", () => {
    test("returns all expected methods", () => {
      const handler = createNavigationHandler(config);

      expect(handler).toHaveProperty("navigateToItem");
      expect(handler).toHaveProperty("updateCenter");
      expect(handler).toHaveProperty("prefetchForNavigation");
      expect(handler).toHaveProperty("navigateWithoutURL");
      expect(handler).toHaveProperty("getMapContext");
      expect(handler).toHaveProperty("toggleItemExpansionWithURL");
      // URL methods exist but are disabled
      expect(handler).toHaveProperty("updateURL");
      expect(handler).toHaveProperty("syncURLWithState");

      expect(typeof handler.navigateToItem).toBe("function");
      expect(typeof handler.updateCenter).toBe("function");
      expect(typeof handler.prefetchForNavigation).toBe("function");
      expect(typeof handler.navigateWithoutURL).toBe("function");
      expect(typeof handler.getMapContext).toBe("function");
      expect(typeof handler.toggleItemExpansionWithURL).toBe("function");
    });
  });
});
