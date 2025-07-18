import { describe, test, expect, beforeEach, vi } from "vitest";
import { MutationCoordinator } from "../mutation-coordinator";
import { initialCacheState } from "../../State/reducer";
import { createMockEventBus, expectEventEmitted } from "~/test-utils/event-bus";
import type { CacheState } from "../../State/types";
import type { DataOperations } from "../../Handlers/types";
import type { StorageService } from "../../Services/types";

describe("MutationCoordinator Event Emissions", () => {
  let mockDispatch: ReturnType<typeof vi.fn>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let mockDataOperations: DataOperations;
  let mockStorageService: StorageService;
  let mockState: CacheState;
  let coordinator: MutationCoordinator;

  const mockExistingItem1 = {
    data: {
      name: "Item 1",
      description: "Description 1",
      url: "",
      color: "#000000",
    },
    metadata: {
      coordId: "1,2",
      dbId: "item-1",
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

  const mockExistingItem2 = {
    data: {
      name: "Item 2",
      description: "Description 2",
      url: "",
      color: "#000000",
    },
    metadata: {
      coordId: "1,3",
      dbId: "item-2",
      depth: 1,
      parentId: undefined,
      coordinates: { userId: 1, groupId: 3, path: [1, 3] },
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
      mutateAsync: vi.fn().mockResolvedValue({ id: 123, name: "New Item" }),
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
        "1,2": mockExistingItem1,
        "1,3": mockExistingItem2,
      },
    };

    coordinator = new MutationCoordinator({
      dispatch: mockDispatch,
      getState: () => ({ itemsById: mockState.itemsById }),
      dataOperations: mockDataOperations,
      storageService: mockStorageService,
      eventBus: mockEventBus,
      mapContext: {
        userId: 1,
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

      await coordinator.moveItem("1,2", "2,3"); // Moving to empty space
      
      // Should emit map.tile_moved event
      expectEventEmitted(mockEventBus, 'map.tile_moved', {
        tileId: "item-1",
        tileName: "Item 1",
        fromCoordId: "1,2",
        toCoordId: "2,3"
      });
    });

    test("emits map.tiles_swapped event for swap operation", async () => {
      // Mock swap operation
      mockMutations.moveItemMutation.mutateAsync.mockResolvedValueOnce({
        movedItemId: "item-1",
        modifiedItems: []
      });

      await coordinator.moveItem("1,2", "1,3"); // Moving to occupied space (swap)
      
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
        getState: () => ({ itemsById: mockState.itemsById }),
        dataOperations: mockDataOperations,
        storageService: mockStorageService,
        mapContext: {
          userId: 1,
          groupId: 1,
          rootItemId: 1,
        },
        ...mockMutations,
      });

      await coordinatorWithoutEventBus.moveItem("1,2", "2,3");

      // Should not emit any events
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    test("handles move operation failure gracefully", async () => {
      // Mock failed move operation
      mockMutations.moveItemMutation.mutateAsync.mockRejectedValueOnce(
        new Error("Move failed")
      );

      await expect(coordinator.moveItem("1,2", "2,3")).rejects.toThrow("Move failed");

      // Should not emit any events on failure
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });
  });

  describe("Event payload correctness", () => {
    test("includes correct tile information in move event", async () => {
      mockMutations.moveItemMutation.mutateAsync.mockResolvedValueOnce({
        movedItemId: "item-1",
        modifiedItems: []
      });

      await coordinator.moveItem("1,2", "3,4");

      const emittedEvent = mockEventBus.emittedEvents[0];
      expect(emittedEvent).toBeDefined();
      expect(emittedEvent?.type).toBe('map.tile_moved');
      expect(emittedEvent?.source).toBe('map_cache');
      expect(emittedEvent?.payload).toEqual({
        tileId: "item-1",
        tileName: "Item 1",
        fromCoordId: "1,2",
        toCoordId: "3,4"
      });
    });

    test("includes correct tile information in swap event", async () => {
      mockMutations.moveItemMutation.mutateAsync.mockResolvedValueOnce({
        movedItemId: "item-1",
        modifiedItems: []
      });

      await coordinator.moveItem("1,2", "1,3");

      const emittedEvent = mockEventBus.emittedEvents[0];
      expect(emittedEvent).toBeDefined();
      expect(emittedEvent?.type).toBe('map.tiles_swapped');
      expect(emittedEvent?.source).toBe('map_cache');
      expect(emittedEvent?.payload).toEqual({
        tile1Id: "item-1",
        tile1Name: "Item 1",
        tile2Id: "item-2",
        tile2Name: "Item 2"
      });
    });
  });
});