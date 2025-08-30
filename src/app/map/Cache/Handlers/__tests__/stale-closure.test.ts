import { describe, test, expect, vi } from "vitest";
import { createNavigationHandler } from "~/app/map/Cache/Handlers/navigation-handler";
import { cacheActions } from "~/app/map/Cache/State/actions";
import { cacheReducer, initialCacheState } from "~/app/map/Cache/State/reducer";
import type { NavigationHandlerConfig } from "~/app/map/Cache/Handlers/navigation-handler";
import type { CacheState, CacheAction } from "~/app/map/Cache/State/types";
import type { DataOperations } from "~/app/map/Cache/Handlers/types";

describe("Stale State Closure Bug", () => {
  test("navigation handler should use current maxDepth config not stale value", async () => {
    let state: CacheState = {
      ...initialCacheState,
      cacheConfig: {
        ...initialCacheState.cacheConfig,
        maxDepth: 2, // Start with depth 2
      },
    };

    const mockDispatch = vi.fn((action: CacheAction) => {
      state = cacheReducer(state, action);
    });

    const mockDataHandler: DataOperations = {
      loadRegion: vi.fn().mockResolvedValue({ success: true }),
      loadItemChildren: vi.fn().mockResolvedValue({ success: true }),
      prefetchRegion: vi.fn().mockResolvedValue({ success: true }),
      invalidateRegion: vi.fn(),
      invalidateAll: vi.fn(),
    };

    const config: NavigationHandlerConfig = {
      dispatch: mockDispatch,
      getState: () => state, // Returns current state
      dataHandler: mockDataHandler,
    };

    const handler = createNavigationHandler(config);

    // Update config to use depth 5
    mockDispatch(cacheActions.updateCacheConfig({ maxDepth: 5 }));

    // Verify state was updated
    expect(state.cacheConfig.maxDepth).toBe(5);

    // Navigate without URL - should use current maxDepth of 5
    await handler.navigateWithoutURL("1,2:0");

    // BUG: Handler still uses the old maxDepth of 2
    // This assertion will fail, proving the handler has stale state
    expect(mockDataHandler.loadRegion).toHaveBeenCalledWith("1,2:0", 5);
  });

  test("data handler should see updated state items", async () => {
    let state: CacheState = {
      ...initialCacheState,
      itemsById: {},
      regionMetadata: {},
    };

    const mockDispatch = vi.fn((action: CacheAction) => {
      state = cacheReducer(state, action);
    });

    const mockDataHandler: DataOperations = {
      loadRegion: vi.fn().mockResolvedValue({ success: true }),
      loadItemChildren: vi.fn().mockResolvedValue({ success: true }),
      prefetchRegion: vi.fn().mockResolvedValue({ success: true }),
      invalidateRegion: vi.fn(),
      invalidateAll: vi.fn(),
    };

    const config: NavigationHandlerConfig = {
      dispatch: mockDispatch,
      getState: () => state, // Returns current state
      dataHandler: mockDataHandler,
    };

    const handler = createNavigationHandler(config);

    // Add an item to state
    const newState = {
      ...state,
      itemsById: {
        "1,2:0": {
          data: { name: "Test", description: "", url: "", color: "#000000" },
          metadata: {
            coordId: "1,2:0",
            dbId: "123",
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
      },
      regionMetadata: {
        "1,2:0": {
          centerCoordId: "1,2:0",
          maxDepth: 3,
          loadedAt: Date.now(),
          itemCoordIds: ["1,2:0"],
        },
      },
    };
    
    // Simulate state update
    state = newState;

    // Navigate to the item
    await handler.navigateToItem("1,2:0");

    // BUG: Handler doesn't see the item in state and tries to prefetch
    // even though the item already exists
    expect(mockDataHandler.prefetchRegion).not.toHaveBeenCalled();
  });
});