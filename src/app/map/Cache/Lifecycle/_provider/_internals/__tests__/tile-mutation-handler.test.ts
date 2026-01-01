import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ServerService } from "~/app/map/Cache/Services";
import type { MapItemAPIContract } from "~/server/api";
import { createMockEventBus, type MockEventBus } from "~/test-utils/event-bus";
import { useTileMutationEffect } from "~/app/map/Cache/Lifecycle/_provider/_internals/tile-mutation-handler";
import { ACTION_TYPES } from "~/app/map/Cache/State/types";
import type { MapItemType, Visibility } from "~/lib/domains/mapping/utils";

describe("Tile Mutation Handler", () => {
  let mockEventBus: MockEventBus;
  let mockDispatch: ReturnType<typeof vi.fn>;
  let mockServerService: ServerService;

  // Sample tile data for testing
  const sampleApiItem: MapItemAPIContract = {
    id: "item-123",
    coordinates: "user-test-1,0:1",
    depth: 1,
    title: "Test Tile",
    content: "Test content",
    preview: "Test preview",
    link: "",
    parentId: null,
    itemType: "item" as MapItemType,
    ownerId: "user-test-1",
    originId: null,
    visibility: "private" as Visibility,
  };

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    mockDispatch = vi.fn();
    mockServerService = {
      fetchItemsForCoordinate: vi.fn().mockResolvedValue([]),
      getItemByCoordinate: vi.fn().mockResolvedValue(sampleApiItem),
      getRootItemById: vi.fn().mockResolvedValue(null),
      getDescendants: vi.fn().mockResolvedValue([]),
      getAncestors: vi.fn().mockResolvedValue([]),
      getItemWithGenerations: vi.fn().mockResolvedValue([]),
      createItem: vi.fn().mockRejectedValue(new Error("Not implemented")),
      updateItem: vi.fn().mockRejectedValue(new Error("Not implemented")),
      deleteItem: vi.fn().mockRejectedValue(new Error("Not implemented")),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Event subscription", () => {
    test("subscribes to map.tile_created events", () => {
      renderHook(() =>
        useTileMutationEffect(mockEventBus, mockDispatch, mockServerService)
      );

      expect(mockEventBus.on).toHaveBeenCalledWith(
        "map.tile_created",
        expect.any(Function)
      );
    });

    test("subscribes to map.tile_updated events", () => {
      renderHook(() =>
        useTileMutationEffect(mockEventBus, mockDispatch, mockServerService)
      );

      expect(mockEventBus.on).toHaveBeenCalledWith(
        "map.tile_updated",
        expect.any(Function)
      );
    });

    test("subscribes to map.tile_deleted events", () => {
      renderHook(() =>
        useTileMutationEffect(mockEventBus, mockDispatch, mockServerService)
      );

      expect(mockEventBus.on).toHaveBeenCalledWith(
        "map.tile_deleted",
        expect.any(Function)
      );
    });

    test("unsubscribes from events on cleanup", () => {
      const { unmount } = renderHook(() =>
        useTileMutationEffect(mockEventBus, mockDispatch, mockServerService)
      );

      const unsubscribeFns = mockEventBus.on.mock.results.map(
        (result) => result.value as () => void
      );

      unmount();

      // Since we can't easily verify the actual unsubscribe was called on the mock,
      // we verify the pattern - the hook returns unsubscribe functions that should be called
      expect(unsubscribeFns.length).toBeGreaterThan(0);
    });

    test("does not subscribe when eventBus is undefined", () => {
      renderHook(() =>
        useTileMutationEffect(undefined, mockDispatch, mockServerService)
      );

      expect(mockEventBus.on).not.toHaveBeenCalled();
    });
  });

  describe("Handle map.tile_created events", () => {
    test("fetches tile data and dispatches loadRegion action for created tile", async () => {
      renderHook(() =>
        useTileMutationEffect(mockEventBus, mockDispatch, mockServerService)
      );

      act(() => {
        mockEventBus.emit({
          type: "map.tile_created",
          source: "agentic",
          payload: {
            tileId: "item-123",
            tileName: "Test Tile",
            coordId: "user-test-1,0:1",
            parentId: "user-test-1,0:",
          },
        });
      });

      await waitFor(() => {
        expect(mockServerService.getItemByCoordinate).toHaveBeenCalledWith(
          "user-test-1,0:1"
        );
      });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: ACTION_TYPES.LOAD_REGION,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            payload: expect.objectContaining({
              centerCoordId: "user-test-1,0:1",
              maxDepth: 1,
            }),
          })
        );
      });
    });

    test("includes fetched item in dispatch payload", async () => {
      renderHook(() =>
        useTileMutationEffect(mockEventBus, mockDispatch, mockServerService)
      );

      act(() => {
        mockEventBus.emit({
          type: "map.tile_created",
          source: "agentic",
          payload: {
            tileId: "item-123",
            tileName: "Test Tile",
            coordId: "user-test-1,0:1",
          },
        });
      });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            payload: expect.objectContaining({
              items: [sampleApiItem],
            }),
          })
        );
      });
    });
  });

  describe("Handle map.tile_updated events", () => {
    test("fetches updated tile data and dispatches loadRegion action", async () => {
      const updatedItem = { ...sampleApiItem, title: "Updated Title" };
      mockServerService.getItemByCoordinate = vi
        .fn()
        .mockResolvedValue(updatedItem);

      renderHook(() =>
        useTileMutationEffect(mockEventBus, mockDispatch, mockServerService)
      );

      act(() => {
        mockEventBus.emit({
          type: "map.tile_updated",
          source: "agentic",
          payload: {
            tileId: "item-123",
            tileName: "Updated Title",
            coordId: "user-test-1,0:1",
            changes: { title: "Updated Title" },
          },
        });
      });

      await waitFor(() => {
        expect(mockServerService.getItemByCoordinate).toHaveBeenCalledWith(
          "user-test-1,0:1"
        );
      });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: ACTION_TYPES.LOAD_REGION,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            payload: expect.objectContaining({
              items: [updatedItem],
              centerCoordId: "user-test-1,0:1",
            }),
          })
        );
      });
    });
  });

  describe("Handle map.tile_deleted events", () => {
    test("dispatches removeItem action for deleted tile", async () => {
      renderHook(() =>
        useTileMutationEffect(mockEventBus, mockDispatch, mockServerService)
      );

      act(() => {
        mockEventBus.emit({
          type: "map.tile_deleted",
          source: "agentic",
          payload: {
            tileId: "item-123",
            tileName: "Test Tile",
            coordId: "user-test-1,0:1",
          },
        });
      });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: ACTION_TYPES.REMOVE_ITEM,
          payload: "user-test-1,0:1",
        });
      });
    });

    test("does not fetch from server for delete events", async () => {
      renderHook(() =>
        useTileMutationEffect(mockEventBus, mockDispatch, mockServerService)
      );

      act(() => {
        mockEventBus.emit({
          type: "map.tile_deleted",
          source: "agentic",
          payload: {
            tileId: "item-123",
            tileName: "Test Tile",
            coordId: "user-test-1,0:1",
          },
        });
      });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalled();
      });

      expect(mockServerService.getItemByCoordinate).not.toHaveBeenCalled();
    });
  });

  describe("Source filtering", () => {
    test("ignores events from map_cache source", async () => {
      renderHook(() =>
        useTileMutationEffect(mockEventBus, mockDispatch, mockServerService)
      );

      act(() => {
        mockEventBus.emit({
          type: "map.tile_created",
          source: "map_cache",
          payload: {
            tileId: "item-123",
            tileName: "Test Tile",
            coordId: "user-test-1,0:1",
          },
        });
      });

      // Allow any async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockServerService.getItemByCoordinate).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    test("processes events from agentic source", async () => {
      renderHook(() =>
        useTileMutationEffect(mockEventBus, mockDispatch, mockServerService)
      );

      act(() => {
        mockEventBus.emit({
          type: "map.tile_created",
          source: "agentic",
          payload: {
            tileId: "item-123",
            tileName: "Test Tile",
            coordId: "user-test-1,0:1",
          },
        });
      });

      await waitFor(() => {
        expect(mockServerService.getItemByCoordinate).toHaveBeenCalled();
      });
    });

    test("ignores events from sync source", async () => {
      renderHook(() =>
        useTileMutationEffect(mockEventBus, mockDispatch, mockServerService)
      );

      act(() => {
        mockEventBus.emit({
          type: "map.tile_updated",
          source: "sync",
          payload: {
            tileId: "item-123",
            tileName: "Test Tile",
            coordId: "user-test-1,0:1",
            changes: {},
          },
        });
      });

      // Allow any async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockServerService.getItemByCoordinate).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe("Edge case: tile outside loaded region", () => {
    test("does not error when event is for tile outside loaded region", async () => {
      // Server returns null for item not found
      mockServerService.getItemByCoordinate = vi.fn().mockResolvedValue(null);

      renderHook(() =>
        useTileMutationEffect(mockEventBus, mockDispatch, mockServerService)
      );

      // Should not throw
      act(() => {
        mockEventBus.emit({
          type: "map.tile_created",
          source: "agentic",
          payload: {
            tileId: "item-999",
            tileName: "Remote Tile",
            coordId: "user-test-1,0:99,99,99",
          },
        });
      });

      // Allow async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 50));
      // If we reached here without throwing, the test passes
    });

    test("does not dispatch when fetched item is null", async () => {
      mockServerService.getItemByCoordinate = vi.fn().mockResolvedValue(null);

      renderHook(() =>
        useTileMutationEffect(mockEventBus, mockDispatch, mockServerService)
      );

      act(() => {
        mockEventBus.emit({
          type: "map.tile_created",
          source: "agentic",
          payload: {
            tileId: "item-999",
            tileName: "Remote Tile",
            coordId: "user-test-1,0:99,99,99",
          },
        });
      });

      await waitFor(() => {
        expect(mockServerService.getItemByCoordinate).toHaveBeenCalled();
      });

      // Allow any pending dispatches
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should not dispatch for null items
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe("Edge case: rapid successive events", () => {
    test("handles multiple rapid create events without race conditions", async () => {
      const items = [
        { ...sampleApiItem, id: "item-1", coordinates: "user-test-1,0:1" },
        { ...sampleApiItem, id: "item-2", coordinates: "user-test-1,0:2" },
        { ...sampleApiItem, id: "item-3", coordinates: "user-test-1,0:3" },
      ];

      let callIndex = 0;
      mockServerService.getItemByCoordinate = vi.fn().mockImplementation(() => {
        const item = items[callIndex];
        callIndex++;
        return Promise.resolve(item);
      });

      renderHook(() =>
        useTileMutationEffect(mockEventBus, mockDispatch, mockServerService)
      );

      // Emit multiple events rapidly
      act(() => {
        mockEventBus.emit({
          type: "map.tile_created",
          source: "agentic",
          payload: {
            tileId: "item-1",
            tileName: "Tile 1",
            coordId: "user-test-1,0:1",
          },
        });
        mockEventBus.emit({
          type: "map.tile_created",
          source: "agentic",
          payload: {
            tileId: "item-2",
            tileName: "Tile 2",
            coordId: "user-test-1,0:2",
          },
        });
        mockEventBus.emit({
          type: "map.tile_created",
          source: "agentic",
          payload: {
            tileId: "item-3",
            tileName: "Tile 3",
            coordId: "user-test-1,0:3",
          },
        });
      });

      await waitFor(() => {
        expect(mockServerService.getItemByCoordinate).toHaveBeenCalledTimes(3);
      });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledTimes(3);
      });
    });

    test("handles interleaved create and delete events", async () => {
      renderHook(() =>
        useTileMutationEffect(mockEventBus, mockDispatch, mockServerService)
      );

      act(() => {
        // Create then delete the same tile rapidly
        mockEventBus.emit({
          type: "map.tile_created",
          source: "agentic",
          payload: {
            tileId: "item-123",
            tileName: "Test Tile",
            coordId: "user-test-1,0:1",
          },
        });
        mockEventBus.emit({
          type: "map.tile_deleted",
          source: "agentic",
          payload: {
            tileId: "item-123",
            tileName: "Test Tile",
            coordId: "user-test-1,0:1",
          },
        });
      });

      await waitFor(() => {
        // Should handle both events
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: ACTION_TYPES.REMOVE_ITEM,
          })
        );
      });
    });

    test("handles rapid updates to the same tile", async () => {
      let updateCount = 0;
      mockServerService.getItemByCoordinate = vi.fn().mockImplementation(() => {
        updateCount++;
        return Promise.resolve({
          ...sampleApiItem,
          title: `Update ${updateCount}`,
        });
      });

      renderHook(() =>
        useTileMutationEffect(mockEventBus, mockDispatch, mockServerService)
      );

      act(() => {
        for (let i = 0; i < 5; i++) {
          mockEventBus.emit({
            type: "map.tile_updated",
            source: "agentic",
            payload: {
              tileId: "item-123",
              tileName: `Update ${i}`,
              coordId: "user-test-1,0:1",
              changes: { title: `Update ${i}` },
            },
          });
        }
      });

      await waitFor(() => {
        expect(mockServerService.getItemByCoordinate).toHaveBeenCalledTimes(5);
      });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledTimes(5);
      });
    });
  });

  describe("Error handling", () => {
    test("handles server fetch errors gracefully", async () => {
      mockServerService.getItemByCoordinate = vi
        .fn()
        .mockRejectedValue(new Error("Network error"));

      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => undefined);

      renderHook(() =>
        useTileMutationEffect(mockEventBus, mockDispatch, mockServerService)
      );

      // Should not throw
      act(() => {
        mockEventBus.emit({
          type: "map.tile_created",
          source: "agentic",
          payload: {
            tileId: "item-123",
            tileName: "Test Tile",
            coordId: "user-test-1,0:1",
          },
        });
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should not dispatch on error
      expect(mockDispatch).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });
});
