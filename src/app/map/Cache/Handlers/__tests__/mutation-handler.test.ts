import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createMutationHandler,
  createMutationHandlerForCache,
} from "~/app/map/Cache/Handlers/mutation-handler";
import { cacheActions } from "~/app/map/Cache/State/actions";
import { initialCacheState } from "~/app/map/Cache/State/reducer";
import type {
  MutationHandlerConfig,
  MutationHandlerServices,
} from "~/app/map/Cache/Handlers/mutation-handler";
import type { CacheState } from "~/app/map/Cache/State/types";
import type { DataOperations } from "~/app/map/Cache/types/handlers";
import { createMockEventBus, expectEventEmitted } from "~/test-utils/event-bus";

describe("Mutation Handler", () => {
  let mockDispatch: ReturnType<typeof vi.fn>;
  let mockServices: MutationHandlerServices;
  let mockDataHandler: DataOperations;
  let mockState: CacheState;
  let config: MutationHandlerConfig;
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  const mockExistingItem = {
    data: {
      name: "Existing Item",
      description: "Existing Description",
      url: "http://example.com",
      color: "#000000",
    },
    metadata: {
      coordId: "1,2",
      dbId: "existing-id",
      depth: 1,
      parentId: undefined,
      coordinates: { userId: 1, groupId: 2, path: [1, 2] },
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
  };

  beforeEach(() => {
    mockDispatch = vi.fn();
    mockEventBus = createMockEventBus();

    // New simplified services (no server mutations)
    mockServices = {
      // Future: could add optimistic update coordination services here
      // For now, mutations use tRPC hooks directly
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
      itemsById: {
        "1,2": mockExistingItem,
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
      services: mockServices,
      getState: () => mockState,
      dataHandler: mockDataHandler,
      eventBus: mockEventBus,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("createItem", () => {
    test("creates item with optimistic update", async () => {
      const handler = createMutationHandler(config);
      const itemData = { name: "New Item", description: "New Description" };

      const result = await handler.createItem("2,3", itemData);

      // Should apply optimistic update first
      expect(mockDispatch).toHaveBeenCalledWith(
        cacheActions.loadRegion(
          expect.arrayContaining([
            expect.objectContaining({
              coordinates: "2,3",
              title: "New Item",
            }),
          ]) as Parameters<typeof cacheActions.loadRegion>[0],
          "2,3",
          1,
        ),
      );

      // NOTE: In real usage, the calling component would handle server mutation
      // This test focuses on cache coordination and optimistic updates

      expect(result).toEqual({
        success: true,
        optimisticApplied: true,
      });
    });

    test("emits map.tile_created event when creating item", async () => {
      const handler = createMutationHandler(config);
      const itemData = { name: "New Item", description: "New Description" };

      await handler.createItem("2,3", itemData);

      // Should emit map.tile_created event
      expectEventEmitted(mockEventBus, 'map.tile_created', {
        tileId: expect.any(String) as string,
        tileName: "New Item",
        coordId: "2,3",
        tileData: expect.objectContaining({
          name: "New Item",
          description: "New Description"
        }) as Record<string, unknown>
      });
    });

    test("handles create errors with rollback", async () => {
      // Simulate an error by making dispatch throw
      mockDispatch.mockImplementationOnce(() => {
        throw new Error("Dispatch error");
      });

      const handler = createMutationHandler(config);
      const itemData = { name: "Failed Item" };

      const result = await handler.createItem("2,3", itemData);

      // Should dispatch error
      expect(mockDispatch).toHaveBeenCalledWith(
        cacheActions.setError(expect.any(Error) as Error),
      );

      expect(result).toEqual({
        success: false,
        error: expect.any(Error) as Error,
        optimisticApplied: false, // Failed before optimistic update could complete
        rolledBack: false,
      });
    });

    test("works with optimistic updates disabled", async () => {
      const noOptimisticState = {
        ...mockState,
        cacheConfig: {
          ...mockState.cacheConfig,
          enableOptimisticUpdates: false,
        },
      };

      const handler = createMutationHandler({
        ...config,
        getState: () => noOptimisticState,
      });
      const itemData = { name: "New Item" };

      const result = await handler.createItem("2,3", itemData);

      expect(result).toEqual({
        success: true,
        optimisticApplied: false,
      });
    });
  });

  describe("updateItem", () => {
    test("updates item with optimistic update", async () => {
      const handler = createMutationHandler(config);
      const updates = { name: "Updated Name" };

      const result = await handler.updateItem("1,2", updates);

      // Should apply optimistic update
      expect(mockDispatch).toHaveBeenCalledWith(
        cacheActions.loadRegion(
          expect.arrayContaining([
            expect.objectContaining({
              title: "Updated Name",
              coordinates: "1,2",
            }),
          ]) as Parameters<typeof cacheActions.loadRegion>[0],
          "1,2",
          1,
        ),
      );

      expect(result).toEqual({
        success: true,
        optimisticApplied: true,
      });
    });

    test("emits map.tile_updated event when updating item", async () => {
      const handler = createMutationHandler(config);
      const updates = { name: "Updated Name" };

      await handler.updateItem("1,2", updates);

      // Should emit map.tile_updated event
      expectEventEmitted(mockEventBus, 'map.tile_updated', {
        tileId: "existing-id",
        tileName: "Updated Name",
        coordId: "1,2",
        updates: { name: "Updated Name" }
      });
    });

    test("handles missing item gracefully", async () => {
      const handler = createMutationHandler(config);
      const updates = { name: "Updated Name" };

      const result = await handler.updateItem("missing-coord", updates);

      expect(result).toEqual({
        success: true,
        optimisticApplied: false, // No optimistic update for missing item
      });
    });
  });

  describe("deleteItem", () => {
    test("deletes item with optimistic removal", async () => {
      const handler = createMutationHandler(config);

      const result = await handler.deleteItem("1,2");

      // Should optimistically remove item
      expect(mockDataHandler.invalidateRegion).toHaveBeenCalledWith("1,2");

      expect(result).toEqual({
        success: true,
        optimisticApplied: true,
      });
    });

    test("emits map.tile_deleted event when deleting item", async () => {
      const handler = createMutationHandler(config);

      await handler.deleteItem("1,2");

      // Should emit map.tile_deleted event
      expectEventEmitted(mockEventBus, 'map.tile_deleted', {
        tileId: "existing-id",
        tileName: "Existing Item",
        coordId: "1,2"
      });
    });

    test("handles delete of missing item", async () => {
      const handler = createMutationHandler(config);

      const result = await handler.deleteItem("missing-coord");

      expect(result).toEqual({
        success: true,
        optimisticApplied: false, // No optimistic update for missing item
      });
    });
  });

  describe("optimistic change tracking", () => {
    test("rollbackOptimisticChange restores previous state for update", async () => {
      const handler = createMutationHandler(config);

      // Simulate a failed update that needs rollback
      const updates = { name: "Failed Update" };

      // First apply optimistic update
      await handler.updateItem("1,2", updates);

      // Get pending changes
      const pendingChanges = handler.getPendingOptimisticChanges();
      expect(pendingChanges).toHaveLength(1);

      // Rollback the change
      handler.rollbackOptimisticChange(pendingChanges[0]!.id);

      // Should restore previous state
      expect(mockDispatch).toHaveBeenCalledWith(
        cacheActions.loadRegion(
          expect.arrayContaining([
            expect.objectContaining({
              name: "Existing Item", // Original name restored
            }),
          ]) as Parameters<typeof cacheActions.loadRegion>[0],
          "1,2",
          1,
        ),
      );
    });

    test("rollbackAllOptimistic clears all pending changes", () => {
      const handler = createMutationHandler(config);

      // No direct way to test this without exposing internal state
      // But we can ensure it doesn't throw
      expect(() => handler.rollbackAllOptimistic()).not.toThrow();
    });

    test("getPendingOptimisticChanges returns tracked changes", async () => {
      const handler = createMutationHandler(config);

      // Should start with no changes
      expect(handler.getPendingOptimisticChanges()).toHaveLength(0);

      // Create an optimistic change
      await handler.updateItem("1,2", { name: "Optimistic Update" });

      // Should track the change
      const changes = handler.getPendingOptimisticChanges();
      expect(changes).toHaveLength(1);
      expect(changes[0]).toMatchObject({
        type: "update",
        coordId: "1,2",
      });
    });
  });

  describe("handler creation", () => {
    test("returns all expected methods", () => {
      const handler = createMutationHandler(config);

      expect(handler).toHaveProperty("createItem");
      expect(handler).toHaveProperty("updateItem");
      expect(handler).toHaveProperty("deleteItem");
      expect(handler).toHaveProperty("rollbackOptimisticChange");
      expect(handler).toHaveProperty("rollbackAllOptimistic");
      expect(handler).toHaveProperty("getPendingOptimisticChanges");

      expect(typeof handler.createItem).toBe("function");
      expect(typeof handler.updateItem).toBe("function");
      expect(typeof handler.deleteItem).toBe("function");
      expect(typeof handler.rollbackOptimisticChange).toBe("function");
      expect(typeof handler.rollbackAllOptimistic).toBe("function");
      expect(typeof handler.getPendingOptimisticChanges).toBe("function");
    });
  });

  describe("New simplified factory approach", () => {
    test("createMutationHandlerForCache works without server service", async () => {
      const handler = createMutationHandlerForCache(
        mockDispatch,
        () => mockState,
        mockDataHandler,
        mockEventBus,
      );

      const result = await handler.createItem("2,3", { name: "New Item" });

      expect(result.success).toBe(true);
      expect(mockDispatch).toHaveBeenCalledWith(
        cacheActions.loadRegion(
          expect.arrayContaining([
            expect.objectContaining({
              title: "New Item",
            }),
          ]) as Parameters<typeof cacheActions.loadRegion>[0],
          "2,3",
          1,
        ),
      );

      // Should emit event
      expectEventEmitted(mockEventBus, 'map.tile_created', {
        tileId: expect.any(String) as string,
        tileName: "New Item",
        coordId: "2,3",
        tileData: expect.objectContaining({
          name: "New Item"
        }) as Record<string, unknown>
      });
    });

    test("simplified factory focuses on cache coordination", async () => {
      const handler = createMutationHandlerForCache(
        mockDispatch,
        () => mockState,
        mockDataHandler,
        mockEventBus,
      );

      // The simplified approach should work the same way
      await handler.updateItem("1,2", {
        name: "Updated via simplified factory",
      });
      await handler.deleteItem("1,2");

      // Should have coordinated cache operations
      // 1 dispatch for update optimistic, 1 invalidateRegion for delete
      expect(mockDispatch).toHaveBeenCalledTimes(1); // Just the update optimistic
      expect(mockDataHandler.invalidateRegion).toHaveBeenCalledWith("1,2");

      // Should emit events
      expectEventEmitted(mockEventBus, 'map.tile_updated', {
        tileId: "existing-id",
        tileName: "Updated via simplified factory",
        coordId: "1,2",
        updates: { name: "Updated via simplified factory" }
      });
      expectEventEmitted(mockEventBus, 'map.tile_deleted', {
        tileId: "existing-id",
        tileName: "Existing Item", // Delete uses the name from current state
        coordId: "1,2"
      });
    });
  });

  describe("Region invalidation", () => {
    test("invalidates affected regions after mutations", async () => {
      const handler = createMutationHandler(config);

      await handler.createItem("2,3", { name: "New Item" }); // No invalidation - just optimistic update
      await handler.updateItem("1,2", { name: "Updated Item" }); // No invalidation - just optimistic update
      await handler.deleteItem("1,2"); // Invalidates region

      // Should invalidate regions only for delete operations
      expect(mockDataHandler.invalidateRegion).toHaveBeenCalledWith("1,2");
      expect(mockDataHandler.invalidateRegion).toHaveBeenCalledTimes(1); // Only delete operation invalidates
    });
  });
});
