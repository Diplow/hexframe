import { describe, test, expect, beforeEach, vi } from "vitest";
import { MutationCoordinator } from "~/app/map/Cache/Lifecycle/MutationCoordinator/mutation-coordinator";
import { initialCacheState } from "~/app/map/Cache/State/reducer";
import { createMockEventBus, expectEventEmitted } from "~/test-utils/event-bus";
import type { CacheState } from "~/app/map/Cache/State/types";
import type { DataOperations } from "~/app/map/Cache/types/handlers";
import type { StorageService } from "~/app/map/Cache/Services";

describe("MutationCoordinator Event Emissions", () => {
  let mockDispatch: ReturnType<typeof vi.fn>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let mockDataOperations: DataOperations;
  let mockStorageService: StorageService;
  let mockState: CacheState;
  let coordinator: MutationCoordinator;

  const mockExistingItem1 = {
    data: {
      title: "Item 1",
      content: "Description 1",
        preview: undefined,
      link: "",
      color: "#000000",
    },
    metadata: {
      coordId: "user-test-1,2",
      dbId: "item-1",
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
  };

  const mockExistingItem2 = {
    data: {
      title: "Item 2",
      content: "Description 2",
        preview: undefined,
      link: "",
      color: "#000000",
    },
    metadata: {
      coordId: "user-test-1,3",
      dbId: "item-2",
      depth: 1,
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
  };

  const mockMutations = {
    addItemMutation: {
      mutateAsync: vi.fn().mockResolvedValue({ id: 123, title: "New Item" }),
    },
    updateItemMutation: {
      mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    },
    deleteItemMutation: {
      mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    },
    moveItemMutation: {
      mutateAsync: vi.fn().mockResolvedValue({ 
        movedItemId: "item-1",
        modifiedItems: []
      }),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDispatch = vi.fn();
    mockEventBus = createMockEventBus();
    
    mockDataOperations = {
      loadRegion: vi.fn().mockResolvedValue({ success: true }),
      loadItemChildren: vi.fn().mockResolvedValue({ success: true }),
      prefetchRegion: vi.fn().mockResolvedValue({ success: true }),
      invalidateRegion: vi.fn(),
      invalidateAll: vi.fn(),
    };
    
    mockStorageService = {
      save: vi.fn().mockResolvedValue(undefined),
      load: vi.fn().mockResolvedValue(null),
      remove: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      getAllKeys: vi.fn().mockResolvedValue([]),
      saveCacheData: vi.fn().mockResolvedValue(undefined),
      loadCacheData: vi.fn().mockResolvedValue(null),
      saveUserPreferences: vi.fn().mockResolvedValue(undefined),
      loadUserPreferences: vi.fn().mockResolvedValue(null),
      saveExpandedItems: vi.fn().mockResolvedValue(undefined),
      loadExpandedItems: vi.fn().mockResolvedValue([]),
      isAvailable: vi.fn().mockResolvedValue(true),
    };
    
    mockState = {
      ...initialCacheState,
      itemsById: {
        "user-test-1,2": mockExistingItem1,
        "user-test-1,3": mockExistingItem2,
      },
    };

    coordinator = new MutationCoordinator({
      dispatch: mockDispatch,
      getState: () => ({ itemsById: mockState.itemsById, pendingOperations: {} }),
      dataOperations: mockDataOperations,
      storageService: mockStorageService,
      eventBus: mockEventBus,
      mapContext: {
        userId: "user-test-1",
        groupId: 1,
        rootItemId: 1,
      },
      ...mockMutations,
    });
  });

  describe("moveItem", () => {
    test("emits map.tile_moved event for move operation", async () => {
      // Mock move operation (not a swap - no item at target)
      mockMutations.moveItemMutation.mutateAsync.mockResolvedValueOnce({
        movedItemId: "item-1",
        modifiedItems: []
      });

      await coordinator.moveItem("user-test-1,2", "user-test-2,3"); // Moving to empty space

      // Should emit map.tile_moved event
      expectEventEmitted(mockEventBus, 'map.tile_moved', {
        tileId: "item-1",
        tileName: "Item 1",
        fromCoordId: "user-test-1,2",
        toCoordId: "user-test-2,3"
      });
    });

    test("emits map.tiles_swapped event for swap operation", async () => {
      // Mock swap operation
      mockMutations.moveItemMutation.mutateAsync.mockResolvedValueOnce({
        movedItemId: "item-1",
        modifiedItems: []
      });

      await coordinator.moveItem("user-test-1,2", "user-test-1,3"); // Moving to occupied space (swap)
      
      // Should emit map.tiles_swapped event
      expectEventEmitted(mockEventBus, 'map.tiles_swapped', {
        tile1Id: "item-1",
        tile1Name: "Item 1",
        tile2Id: "item-2",
        tile2Name: "Item 2"
      });
    });

    test("does not emit event when eventBus is not provided", async () => {
      // Create coordinator without event bus
      const coordinatorWithoutEventBus = new MutationCoordinator({
        dispatch: mockDispatch,
        getState: () => ({ itemsById: mockState.itemsById, pendingOperations: {} }),
        dataOperations: mockDataOperations,
        storageService: mockStorageService,
        mapContext: {
          userId: "user-test-1",
          groupId: 1,
          rootItemId: 1,
        },
        ...mockMutations,
      });

      await coordinatorWithoutEventBus.moveItem("user-test-1,2", "user-test-2,3");

      // Should not emit any events
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    test("handles move operation failure gracefully", async () => {
      // Mock failed move operation
      mockMutations.moveItemMutation.mutateAsync.mockRejectedValueOnce(
        new Error("Move failed")
      );

      await expect(coordinator.moveItem("user-test-1,2", "user-test-2,3")).rejects.toThrow("Move failed");

      // Should emit operation_started event but not tile_moved/tiles_swapped completion events
      expectEventEmitted(mockEventBus, 'map.operation_started');

      // Ensure no completion events were emitted
      const hasMovedEvent = mockEventBus.emittedEvents.some(e => e.type === 'map.tile_moved');
      const hasSwappedEvent = mockEventBus.emittedEvents.some(e => e.type === 'map.tiles_swapped');
      expect(hasMovedEvent).toBe(false);
      expect(hasSwappedEvent).toBe(false);
    });
  });

  describe("Event payload correctness", () => {
    test("includes correct tile information in move event", async () => {
      mockMutations.moveItemMutation.mutateAsync.mockResolvedValueOnce({
        movedItemId: "item-1",
        modifiedItems: []
      });

      await coordinator.moveItem("user-test-1,2", "user-test-3,4");

      // Should emit tile_moved event with correct payload
      const movedEvent = mockEventBus.emittedEvents.find(e => e.type === 'map.tile_moved');
      expect(movedEvent).toBeDefined();
      expect(movedEvent?.source).toBe('map_cache');
      expect(movedEvent?.payload).toEqual({
        tileId: "item-1",
        tileName: "Item 1",
        fromCoordId: "user-test-1,2",
        toCoordId: "user-test-3,4"
      });
    });

    test("includes correct tile information in swap event", async () => {
      mockMutations.moveItemMutation.mutateAsync.mockResolvedValueOnce({
        movedItemId: "item-1",
        modifiedItems: []
      });

      await coordinator.moveItem("user-test-1,2", "user-test-1,3");

      // Should emit tiles_swapped event with correct payload
      const swappedEvent = mockEventBus.emittedEvents.find(e => e.type === 'map.tiles_swapped');
      expect(swappedEvent).toBeDefined();
      expect(swappedEvent?.source).toBe('map_cache');
      expect(swappedEvent?.payload).toEqual({
        tile1Id: "item-1",
        tile1Name: "Item 1",
        tile2Id: "item-2",
        tile2Name: "Item 2"
      });
    });
  });

  describe("Cache invalidation for moved items", () => {
    test("removes stale coordIds when moving item with regular children", async () => {
      // Setup: Item at 1,0:1 with a child at 1,0:1,2
      const parentItem = {
        ...mockExistingItem1,
        metadata: {
          ...mockExistingItem1.metadata,
          coordId: "user-test-1,0:1",
          dbId: "parent-1",
        },
      };

      const childItem = {
        ...mockExistingItem2,
        metadata: {
          ...mockExistingItem2.metadata,
          coordId: "user-test-1,0:1,2",
          dbId: "child-1",
        },
      };

      mockState.itemsById = {
        "user-test-1,0:1": parentItem,
        "user-test-1,0:1,2": childItem,
      };

      // Mock server response: parent moved to [3], child now at [3,2]
      mockMutations.moveItemMutation.mutateAsync.mockResolvedValueOnce({
        movedItemId: "parent-1",
        modifiedItems: [
          {
            id: "parent-1",
            coordinates: "user-test-1,0:3",
            title: "Item 1",
            content: "Description 1",
            preview: undefined,
            link: "",
            depth: 1,
            parentId: null,
            itemType: "BASE" as const,
            ownerId: "test-owner",
          },
          {
            id: "child-1",
            coordinates: "user-test-1,0:3,2",
            title: "Item 2",
            content: "Description 2",
            preview: undefined,
            link: "",
            depth: 2,
            parentId: "parent-1",
            itemType: "BASE" as const,
            ownerId: "test-owner",
          },
        ],
      });

      // Execute move
      await coordinator.moveItem("user-test-1,0:1", "user-test-1,0:3");

      // Verify that stale coordIds were removed
      const removeItemCalls = mockDispatch.mock.calls.filter(
        (call) => (call[0] as { type?: string })?.type === "REMOVE_ITEM"
      );

      // Should have removed OLD coordIds: "user-test-1,0:1" and "user-test-1,0:1,2"
      expect(removeItemCalls).toEqual(
        expect.arrayContaining([
          [expect.objectContaining({ payload: "user-test-1,0:1" })],
          [expect.objectContaining({ payload: "user-test-1,0:1,2" })],
        ])
      );
    });

    test("removes stale coordIds when moving item with composed child (direction 0)", async () => {
      // Setup: Item at 1,0:1 with composed child at 1,0:1,0
      const parentItem = {
        ...mockExistingItem1,
        metadata: {
          ...mockExistingItem1.metadata,
          coordId: "user-test-1,0:1",
          dbId: "parent-1",
        },
      };

      const composedChild = {
        ...mockExistingItem2,
        metadata: {
          ...mockExistingItem2.metadata,
          coordId: "user-test-1,0:1,0",
          dbId: "composed-1",
        },
      };

      mockState.itemsById = {
        "user-test-1,0:1": parentItem,
        "user-test-1,0:1,0": composedChild,
      };

      // Mock server response: parent moved to [2], composed child now at [2,0]
      mockMutations.moveItemMutation.mutateAsync.mockResolvedValueOnce({
        movedItemId: "parent-1",
        modifiedItems: [
          {
            id: "parent-1",
            coordinates: "user-test-1,0:2",
            title: "Item 1",
            content: "Description 1",
            preview: undefined,
            link: "",
            depth: 1,
            parentId: null,
            itemType: "BASE" as const,
            ownerId: "test-owner",
          },
          {
            id: "composed-1",
            coordinates: "user-test-1,0:2,0",
            title: "Item 2",
            content: "Description 2",
            preview: undefined,
            link: "",
            depth: 2,
            parentId: "parent-1",
            itemType: "BASE" as const,
            ownerId: "test-owner",
          },
        ],
      });

      // Execute move
      await coordinator.moveItem("user-test-1,0:1", "user-test-1,0:2");

      // Verify that stale coordIds were removed
      const removeItemCalls = mockDispatch.mock.calls.filter(
        (call) => (call[0] as { type?: string })?.type === "REMOVE_ITEM"
      );

      // Should have removed OLD coordIds: "user-test-1,0:1" and "user-test-1,0:1,0"
      expect(removeItemCalls).toEqual(
        expect.arrayContaining([
          [expect.objectContaining({ payload: "user-test-1,0:1" })],
          [expect.objectContaining({ payload: "user-test-1,0:1,0" })],
        ])
      );
    });

    test("removes stale coordIds for nested descendants (grandchildren)", async () => {
      // Setup: Item at 1,0:1 with child at 1,0:1,2 and grandchild at 1,0:1,2,3
      const parentItem = {
        ...mockExistingItem1,
        metadata: {
          ...mockExistingItem1.metadata,
          coordId: "user-test-1,0:1",
          dbId: "parent-1",
        },
      };

      const childItem = {
        ...mockExistingItem2,
        metadata: {
          ...mockExistingItem2.metadata,
          coordId: "user-test-1,0:1,2",
          dbId: "child-1",
        },
      };

      const grandchildItem = {
        ...mockExistingItem1,
        metadata: {
          ...mockExistingItem1.metadata,
          coordId: "user-test-1,0:1,2,3",
          dbId: "grandchild-1",
        },
      };

      mockState.itemsById = {
        "user-test-1,0:1": parentItem,
        "user-test-1,0:1,2": childItem,
        "user-test-1,0:1,2,3": grandchildItem,
      };

      // Mock server response: parent moved to [4], children moved accordingly
      mockMutations.moveItemMutation.mutateAsync.mockResolvedValueOnce({
        movedItemId: "parent-1",
        modifiedItems: [
          {
            id: "parent-1",
            coordinates: "user-test-1,0:4",
            title: "Item 1",
            content: "Description 1",
            preview: undefined,
            link: "",
            depth: 1,
            parentId: null,
            itemType: "BASE" as const,
            ownerId: "test-owner",
          },
          {
            id: "child-1",
            coordinates: "user-test-1,0:4,2",
            title: "Item 2",
            content: "Description 2",
            preview: undefined,
            link: "",
            depth: 2,
            parentId: "parent-1",
            itemType: "BASE" as const,
            ownerId: "test-owner",
          },
          {
            id: "grandchild-1",
            coordinates: "user-test-1,0:4,2,3",
            title: "Item 1",
            content: "Description 1",
            preview: undefined,
            link: "",
            depth: 3,
            parentId: "child-1",
            itemType: "BASE" as const,
            ownerId: "test-owner",
          },
        ],
      });

      // Execute move
      await coordinator.moveItem("user-test-1,0:1", "user-test-1,0:4");

      // Verify that ALL stale coordIds were removed
      const removeItemCalls = mockDispatch.mock.calls.filter(
        (call) => (call[0] as { type?: string })?.type === "REMOVE_ITEM"
      );

      // Should have removed OLD coordIds: "user-test-1,0:1", "user-test-1,0:1,2", "user-test-1,0:1,2,3"
      expect(removeItemCalls).toEqual(
        expect.arrayContaining([
          [expect.objectContaining({ payload: "user-test-1,0:1" })],
          [expect.objectContaining({ payload: "user-test-1,0:1,2" })],
          [expect.objectContaining({ payload: "user-test-1,0:1,2,3" })],
        ])
      );
    });

    test("removes stale coordIds even when moving to empty space (no swap)", async () => {
      // Setup: Item at 1,0:1 with child at 1,0:1,2
      const parentItem = {
        ...mockExistingItem1,
        metadata: {
          ...mockExistingItem1.metadata,
          coordId: "user-test-1,0:1",
          dbId: "parent-1",
        },
      };

      const childItem = {
        ...mockExistingItem2,
        metadata: {
          ...mockExistingItem2.metadata,
          coordId: "user-test-1,0:1,2",
          dbId: "child-1",
        },
      };

      mockState.itemsById = {
        "user-test-1,0:1": parentItem,
        "user-test-1,0:1,2": childItem,
      };

      // Mock server response: parent moved to [5] (empty space), child now at [5,2]
      mockMutations.moveItemMutation.mutateAsync.mockResolvedValueOnce({
        movedItemId: "parent-1",
        modifiedItems: [
          {
            id: "parent-1",
            coordinates: "user-test-1,0:5",
            title: "Item 1",
            content: "Description 1",
            preview: undefined,
            link: "",
            depth: 1,
            parentId: null,
            itemType: "BASE" as const,
            ownerId: "test-owner",
          },
          {
            id: "child-1",
            coordinates: "user-test-1,0:5,2",
            title: "Item 2",
            content: "Description 2",
            preview: undefined,
            link: "",
            depth: 2,
            parentId: "parent-1",
            itemType: "BASE" as const,
            ownerId: "test-owner",
          },
        ],
      });

      // Execute move (not a swap - target is empty)
      await coordinator.moveItem("user-test-1,0:1", "user-test-1,0:5");

      // Verify that stale coordIds were removed
      const removeItemCalls = mockDispatch.mock.calls.filter(
        (call) => (call[0] as { type?: string })?.type === "REMOVE_ITEM"
      );

      // Should have removed OLD coordIds: "user-test-1,0:1" and "user-test-1,0:1,2"
      expect(removeItemCalls).toEqual(
        expect.arrayContaining([
          [expect.objectContaining({ payload: "user-test-1,0:1" })],
          [expect.objectContaining({ payload: "user-test-1,0:1,2" })],
        ])
      );
    });

    test("handles move with no children correctly", async () => {
      // Setup: Single item at 1,0:1 with no children
      const parentItem = {
        ...mockExistingItem1,
        metadata: {
          ...mockExistingItem1.metadata,
          coordId: "user-test-1,0:1",
          dbId: "parent-1",
        },
      };

      mockState.itemsById = {
        "user-test-1,0:1": parentItem,
      };

      // Mock server response: parent moved to [2], no children
      mockMutations.moveItemMutation.mutateAsync.mockResolvedValueOnce({
        movedItemId: "parent-1",
        modifiedItems: [
          {
            id: "parent-1",
            coordinates: "user-test-1,0:2",
            title: "Item 1",
            content: "Description 1",
            preview: undefined,
            link: "",
            depth: 1,
            parentId: null,
            itemType: "BASE" as const,
            ownerId: "test-owner",
          },
        ],
      });

      // Execute move
      await coordinator.moveItem("user-test-1,0:1", "user-test-1,0:2");

      // Verify that only the parent's old coordId was removed
      const removeItemCalls = mockDispatch.mock.calls.filter(
        (call) => (call[0] as { type?: string })?.type === "REMOVE_ITEM"
      );

      // Should have removed only OLD coordId: "user-test-1,0:1"
      expect(removeItemCalls).toHaveLength(2); // One from optimistic, one from finalize
      expect(removeItemCalls).toEqual(
        expect.arrayContaining([
          [expect.objectContaining({ payload: "user-test-1,0:1" })],
        ])
      );
    });
  });
});