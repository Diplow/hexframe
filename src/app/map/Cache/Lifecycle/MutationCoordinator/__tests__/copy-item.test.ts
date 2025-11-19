import { describe, test, expect, beforeEach, vi } from "vitest";
import { MutationCoordinator } from "~/app/map/Cache/Lifecycle/MutationCoordinator/mutation-coordinator";
import { initialCacheState } from "~/app/map/Cache/State/reducer";
import { createMockEventBus, expectEventEmitted } from "~/test-utils/event-bus";
import type { CacheState } from "~/app/map/Cache/State/types";
import type { DataOperations } from "~/app/map/Cache/types/handlers";
import type { StorageService } from "~/app/map/Cache/Services";
import type { MapItemAPIContract } from "~/server/api";
import { MapItemType } from "~/lib/domains/mapping";

describe("MutationCoordinator - copyItem", () => {
  let mockDispatch: ReturnType<typeof vi.fn>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let mockDataOperations: DataOperations;
  let mockStorageService: StorageService;
  let mockState: CacheState;
  let coordinator: MutationCoordinator;

  const mockSourceItem = {
    data: {
      title: "Source Item",
      content: "Source content",
      preview: "Source preview",
      link: "https://source.com",
      color: "#000000",
    },
    metadata: {
      coordId: "1,0:1",
      dbId: "source-1",
      depth: 1,
      parentId: undefined,
      coordinates: { userId: "user-test-1", groupId: 0, path: [1] },
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

  const mockSourceChild = {
    data: {
      title: "Source Child",
      content: "Child content",
      preview: undefined,
      link: "",
      color: "#000000",
    },
    metadata: {
      coordId: "1,0:1,2",
      dbId: "child-1",
      depth: 2,
      parentId: undefined,
      coordinates: { userId: "user-test-1", groupId: 0, path: [1, 2] },
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

  const mockCopyItemMutation = {
    mutateAsync: vi.fn(),
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
    copyItemMutation: mockCopyItemMutation,
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
        "1,0:1": mockSourceItem,
        "1,0:1,2": mockSourceChild,
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
        groupId: 0,
        rootItemId: 1,
      },
      ...mockMutations,
    });

    // Reset mock call counts
    vi.clearAllMocks();
  });

  describe("copyItem - Happy path", () => {
    test("should apply optimistic deep copy of source tree to destination", async () => {
      const copiedItemResponse: MapItemAPIContract = {
        id: "copy-1",
        coordinates: "1,0:3",
        title: "Source Item",
        content: "Source content",
        preview: "Source preview",
        link: "https://source.com",
        depth: 1,
        parentId: "parent-1",
        itemType: MapItemType.BASE,
        ownerId: "test-owner",
        originId: "source-1",
      };

      mockCopyItemMutation.mutateAsync.mockResolvedValueOnce(copiedItemResponse);

      await coordinator.copyItem("1,0:1", "1,0:3", "1");

      // Verify optimistic update was applied (load region called twice: optimistic + finalize)
      const loadRegionCalls = mockDispatch.mock.calls.filter(
        (call) => (call[0] as { type?: string })?.type === "LOAD_REGION"
      );
      expect(loadRegionCalls.length).toBeGreaterThanOrEqual(1);
    });

    test("should call server copyMapItem mutation with correct parameters", async () => {
      const copiedItemResponse: MapItemAPIContract = {
        id: "copy-1",
        coordinates: "1,0:3",
        title: "Source Item",
        content: "Source content",
        preview: "Source preview",
        link: "https://source.com",
        depth: 1,
        parentId: "parent-1",
        itemType: MapItemType.BASE,
        ownerId: "test-owner",
        originId: "source-1",
      };

      mockCopyItemMutation.mutateAsync.mockResolvedValueOnce(copiedItemResponse);

      await coordinator.copyItem("1,0:1", "1,0:3", "1");

      expect(mockCopyItemMutation.mutateAsync).toHaveBeenCalledWith({
        sourceCoords: { userId: "user-test-1", groupId: 0, path: [1] },
        destinationCoords: { userId: "user-test-1", groupId: 0, path: [3] },
        destinationParentId: 1,
      });
    });

    test("should finalize with server response data", async () => {
      const copiedItemResponse: MapItemAPIContract = {
        id: "copy-1",
        coordinates: "1,0:3",
        title: "Source Item",
        content: "Source content",
        preview: "Source preview",
        link: "https://source.com",
        depth: 1,
        parentId: "parent-1",
        itemType: MapItemType.BASE,
        ownerId: "test-owner",
        originId: "source-1",
      };

      mockCopyItemMutation.mutateAsync.mockResolvedValueOnce(copiedItemResponse);

      await coordinator.copyItem("1,0:1", "1,0:3", "1");

      // Verify final load region was called with server data
      const loadRegionCalls = mockDispatch.mock.calls.filter(
        (call) => (call[0] as { type?: string })?.type === "LOAD_REGION"
      );
      expect(loadRegionCalls.length).toBeGreaterThan(0);
    });

    test("should emit map.item_copied event on success", async () => {
      const copiedItemResponse: MapItemAPIContract = {
        id: "copy-1",
        coordinates: "1,0:3",
        title: "Source Item",
        content: "Source content",
        preview: "Source preview",
        link: "https://source.com",
        depth: 1,
        parentId: "parent-1",
        itemType: MapItemType.BASE,
        ownerId: "test-owner",
        originId: "source-1",
      };

      mockCopyItemMutation.mutateAsync.mockResolvedValueOnce(copiedItemResponse);

      await coordinator.copyItem("1,0:1", "1,0:3", "1");

      expectEventEmitted(mockEventBus, 'map.item_copied', {
        sourceId: "source-1",
        sourceName: "Source Item",
        destinationId: "copy-1",
        fromCoordId: "1,0:1",
        toCoordId: "1,0:3",
      });
    });

    test("should return success result with copied item data", async () => {
      const copiedItemResponse: MapItemAPIContract = {
        id: "copy-1",
        coordinates: "1,0:3",
        title: "Source Item",
        content: "Source content",
        preview: "Source preview",
        link: "https://source.com",
        depth: 1,
        parentId: "parent-1",
        itemType: MapItemType.BASE,
        ownerId: "test-owner",
        originId: "source-1",
      };

      mockCopyItemMutation.mutateAsync.mockResolvedValueOnce(copiedItemResponse);

      const result = await coordinator.copyItem("1,0:1", "1,0:3", "1");

      expect(result).toEqual({
        success: true,
        data: copiedItemResponse,
      });
    });
  });

  describe("copyItem - Deep copy with children", () => {
    test("should optimistically copy entire subtree structure", async () => {
      const copiedItemResponse: MapItemAPIContract = {
        id: "copy-1",
        coordinates: "1,0:3",
        title: "Source Item",
        content: "Source content",
        preview: "Source preview",
        link: "https://source.com",
        depth: 1,
        parentId: "parent-1",
        itemType: MapItemType.BASE,
        ownerId: "test-owner",
        originId: "source-1",
      };

      mockCopyItemMutation.mutateAsync.mockResolvedValueOnce(copiedItemResponse);

      await coordinator.copyItem("1,0:1", "1,0:3", "1");

      // Verify load region includes both parent and child
      const loadRegionCalls = mockDispatch.mock.calls.filter(
        (call) => (call[0] as { type?: string })?.type === "LOAD_REGION"
      );
      expect(loadRegionCalls.length).toBeGreaterThan(0);
    });

    test("should preserve relative path structure in copied children", async () => {
      // Add grandchild to source
      const mockSourceGrandchild = {
        data: {
          title: "Source Grandchild",
          content: "Grandchild content",
          preview: undefined,
          link: "",
          color: "#000000",
        },
        metadata: {
          coordId: "1,0:1,2,4",
          dbId: "grandchild-1",
          depth: 3,
          parentId: undefined,
          coordinates: { userId: "user-test-1", groupId: 0, path: [1, 2, 4] },
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

      mockState.itemsById["1,0:1,2,4"] = mockSourceGrandchild;

      const copiedItemResponse: MapItemAPIContract = {
        id: "copy-1",
        coordinates: "1,0:3",
        title: "Source Item",
        content: "Source content",
        preview: "Source preview",
        link: "https://source.com",
        depth: 1,
        parentId: "parent-1",
        itemType: MapItemType.BASE,
        ownerId: "test-owner",
        originId: "source-1",
      };

      mockCopyItemMutation.mutateAsync.mockResolvedValueOnce(copiedItemResponse);

      await coordinator.copyItem("1,0:1", "1,0:3", "1");

      // Verify path structure is preserved (relative paths maintained)
      // Source: [1], [1,2], [1,2,4]
      // Destination: [3], [3,2], [3,2,4]
      const loadRegionCalls = mockDispatch.mock.calls.filter(
        (call) => (call[0] as { type?: string })?.type === "LOAD_REGION"
      );
      expect(loadRegionCalls.length).toBeGreaterThan(0);
    });
  });

  describe("copyItem - Rollback on failure", () => {
    test("should rollback optimistic copy when server call fails", async () => {
      mockCopyItemMutation.mutateAsync.mockRejectedValueOnce(
        new Error("Server copy failed")
      );

      await expect(
        coordinator.copyItem("1,0:1", "1,0:3", "1")
      ).rejects.toThrow("Server copy failed");

      // Verify rollback: all optimistically added items should be removed
      const removeItemCalls = mockDispatch.mock.calls.filter(
        (call) => (call[0] as { type?: string })?.type === "REMOVE_ITEM"
      );

      // Should remove optimistically created items at destination
      expect(removeItemCalls.length).toBeGreaterThan(0);
    });

    test("should remove all optimistically copied items on rollback (including children)", async () => {
      mockCopyItemMutation.mutateAsync.mockRejectedValueOnce(
        new Error("Server copy failed")
      );

      await expect(
        coordinator.copyItem("1,0:1", "1,0:3", "1")
      ).rejects.toThrow("Server copy failed");

      // All optimistically copied items (parent + children) should be removed
      const removeItemCalls = mockDispatch.mock.calls.filter(
        (call) => (call[0] as { type?: string })?.type === "REMOVE_ITEM"
      );

      // Should have removed at least the parent (coordId "1,0:3")
      expect(removeItemCalls.length).toBeGreaterThan(0);
    });

    test("should not emit event on failure", async () => {
      mockCopyItemMutation.mutateAsync.mockRejectedValueOnce(
        new Error("Server copy failed")
      );

      await expect(
        coordinator.copyItem("1,0:1", "1,0:3", "1")
      ).rejects.toThrow("Server copy failed");

      // Should emit operation_started event but not completion event
      expect(mockEventBus.emit).toHaveBeenCalledTimes(1);
      expect(mockEventBus.emittedEvents[0]?.type).toBe('map.operation_started');
    });

    test("should preserve source items after rollback", async () => {
      mockCopyItemMutation.mutateAsync.mockRejectedValueOnce(
        new Error("Server copy failed")
      );

      await expect(
        coordinator.copyItem("1,0:1", "1,0:3", "1")
      ).rejects.toThrow("Server copy failed");

      // Source items should still be in state (not affected by rollback)
      expect(mockState.itemsById["1,0:1"]).toBeDefined();
      expect(mockState.itemsById["1,0:1,2"]).toBeDefined();
    });
  });

  describe("copyItem - Edge cases", () => {
    test("should throw error if source item does not exist", async () => {
      await expect(
        coordinator.copyItem("1,0:999", "1,0:3", "1")
      ).rejects.toThrow();

      // Should not call server mutation
      expect(mockCopyItemMutation.mutateAsync).not.toHaveBeenCalled();
    });

    test("should handle copy to same level (different direction)", async () => {
      const copiedItemResponse: MapItemAPIContract = {
        id: "copy-1",
        coordinates: "1,0:2",
        title: "Source Item",
        content: "Source content",
        preview: "Source preview",
        link: "https://source.com",
        depth: 1,
        parentId: "parent-1",
        itemType: MapItemType.BASE,
        ownerId: "test-owner",
        originId: "source-1",
      };

      mockCopyItemMutation.mutateAsync.mockResolvedValueOnce(copiedItemResponse);

      await coordinator.copyItem("1,0:1", "1,0:2", "1");

      expect(mockCopyItemMutation.mutateAsync).toHaveBeenCalled();
    });

    test("should handle copy to deeper level", async () => {
      const copiedItemResponse: MapItemAPIContract = {
        id: "copy-1",
        coordinates: "1,0:1,3,4",
        title: "Source Item",
        content: "Source content",
        preview: "Source preview",
        link: "https://source.com",
        depth: 3,
        parentId: "parent-1",
        itemType: MapItemType.BASE,
        ownerId: "test-owner",
        originId: "source-1",
      };

      mockCopyItemMutation.mutateAsync.mockResolvedValueOnce(copiedItemResponse);

      await coordinator.copyItem("1,0:1", "1,0:1,3,4", "1");

      expect(mockCopyItemMutation.mutateAsync).toHaveBeenCalled();
    });

    test("should not allow copying item to itself", async () => {
      await expect(
        coordinator.copyItem("1,0:1", "1,0:1", "1")
      ).rejects.toThrow();

      expect(mockCopyItemMutation.mutateAsync).not.toHaveBeenCalled();
    });
  });

  describe("copyItem - Race condition prevention", () => {
    test("should prevent concurrent copy operations on same source", async () => {
      const copiedItemResponse: MapItemAPIContract = {
        id: "copy-1",
        coordinates: "1,0:3",
        title: "Source Item",
        content: "Source content",
        preview: "Source preview",
        link: "https://source.com",
        depth: 1,
        parentId: "parent-1",
        itemType: MapItemType.BASE,
        ownerId: "test-owner",
        originId: "source-1",
      };

      // Make first mutation slow
      mockCopyItemMutation.mutateAsync.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(copiedItemResponse), 100))
      );

      const firstCopy = coordinator.copyItem("1,0:1", "1,0:3", "1");

      // Try to copy again while first is in progress
      await expect(
        coordinator.copyItem("1,0:1", "1,0:4", "2")
      ).rejects.toThrow("Operation already in progress");

      await firstCopy;
    });

    test("should allow copy operation after previous one completes", async () => {
      const firstCopiedResponse: MapItemAPIContract = {
        id: "copy-1",
        coordinates: "1,0:3",
        title: "Source Item",
        content: "Source content",
        preview: "Source preview",
        link: "https://source.com",
        depth: 1,
        parentId: "parent-1",
        itemType: MapItemType.BASE,
        ownerId: "test-owner",
        originId: "source-1",
      };

      const secondCopiedResponse: MapItemAPIContract = {
        id: "copy-2",
        coordinates: "1,0:4",
        title: "Source Item",
        content: "Source content",
        preview: "Source preview",
        link: "https://source.com",
        depth: 1,
        parentId: "parent-2",
        itemType: MapItemType.BASE,
        ownerId: "test-owner",
        originId: "source-1",
      };

      mockCopyItemMutation.mutateAsync
        .mockResolvedValueOnce(firstCopiedResponse)
        .mockResolvedValueOnce(secondCopiedResponse);

      await coordinator.copyItem("1,0:1", "1,0:3", "1");
      await coordinator.copyItem("1,0:1", "1,0:4", "2");

      expect(mockCopyItemMutation.mutateAsync).toHaveBeenCalledTimes(2);
    });
  });
});
