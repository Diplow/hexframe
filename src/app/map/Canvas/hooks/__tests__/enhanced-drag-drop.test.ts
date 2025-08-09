/**
 * @vitest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDragAndDrop } from "../useDragAndDrop";
import type { CacheState } from "~/app/map/Cache/State/types";
import type { TileData } from "~/app/map/types/tile-data";

// Mock data
const createMockTile = (coordId: string, ownerId: string): TileData => {
  const [userGroup, pathStr] = coordId.split(":");
  const [userId, groupId] = userGroup?.split(",") ?? ["0", "0"];
  const path = pathStr ? pathStr.split(",").map(Number) : [];
  
  return {
    metadata: {
      dbId: coordId,
      coordId,
      coordinates: {
        userId: parseInt(userId ?? "0"),
        groupId: parseInt(groupId ?? "0"),
        path,
      },
      parentId: undefined,
      ownerId,
      depth: path.length,
    },
  data: {
    name: `Tile ${coordId}`,
    description: "",
    url: "",
    color: "amber",
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
};

describe("Enhanced Drag and Drop", () => {
  const mockMutation = {
    mutateAsync: vi.fn().mockResolvedValue({
      modifiedItems: [],
      movedItemId: "test",
      affectedCount: 1,
    }),
  };

  it("should allow dropping on any empty tile in user space", () => {
    const tile1 = createMockTile("0,0:1", "123");
    const rootTile = createMockTile("0,0", "123");
    
    const cacheState: CacheState = {
      itemsById: {
        "0,0": rootTile,
        "0,0:1": tile1,
        // Many other positions are empty
      },
      expandedItemIds: [],
      currentCenter: "0,0",
      isLoading: false,
      error: null,
      cacheConfig: {
        maxAge: 300000,
        backgroundRefreshInterval: 60000,
        enableOptimisticUpdates: true,
        maxDepth: 3,
      },
      regionMetadata: {},
      lastUpdated: Date.now(),
    };

    const { result } = renderHook(() =>
      useDragAndDrop({
        cacheState,
        currentUserId: 123,
        moveMapItemMutation: mockMutation,
        updateCache: vi.fn(),
      })
    );

    // Start dragging
    const dragEvent = {
      dataTransfer: {
        effectAllowed: "move" as DataTransfer["effectAllowed"],
        setData: vi.fn(),
      } as unknown as DataTransfer,
      clientX: 100,
      clientY: 100,
      preventDefault: vi.fn(),
      nativeEvent: {
        offsetX: 10,
        offsetY: 10,
      } as unknown as MouseEvent,
    } as unknown as React.DragEvent<HTMLDivElement>;

    act(() => {
      result.current.dragHandlers.onDragStart("0,0:1", dragEvent);
    });

    // Can drop on empty positions anywhere in the hierarchy
    expect(result.current.isValidDropTarget("0,0:2")).toBe(true); // Sibling
    expect(result.current.isValidDropTarget("0,0:1,1")).toBe(true); // Child of different tile
    expect(result.current.isValidDropTarget("0,0:3,2,1")).toBe(true); // Deep nested position
    
    // Cannot drop on self or root
    expect(result.current.isValidDropTarget("0,0:1")).toBe(false); // Self
    expect(result.current.isValidDropTarget("0,0")).toBe(false); // Root
  });

  it("should allow swapping with occupied tiles", () => {
    const tile1 = createMockTile("0,0:1", "123");
    const tile2 = createMockTile("0,0:2", "123");
    const tile3 = createMockTile("0,0:3", "123");
    const tile3Child = createMockTile("0,0:3,1", "123"); // Nested tile
    const rootTile = createMockTile("0,0", "123");
    
    const cacheState: CacheState = {
      itemsById: {
        "0,0": rootTile,
        "0,0:1": tile1,
        "0,0:2": tile2,
        "0,0:3": tile3,
        "0,0:3,1": tile3Child,
      },
      expandedItemIds: [],
      currentCenter: "0,0",
      isLoading: false,
      error: null,
      cacheConfig: {
        maxAge: 300000,
        backgroundRefreshInterval: 60000,
        enableOptimisticUpdates: true,
        maxDepth: 3,
      },
      regionMetadata: {},
      lastUpdated: Date.now(),
    };

    const { result } = renderHook(() =>
      useDragAndDrop({
        cacheState,
        currentUserId: 123,
        moveMapItemMutation: mockMutation,
        updateCache: vi.fn(),
      })
    );

    // Start dragging tile1
    const dragEvent = {
      dataTransfer: {
        effectAllowed: "move" as DataTransfer["effectAllowed"],
        setData: vi.fn(),
      } as unknown as DataTransfer,
      clientX: 100,
      clientY: 100,
      preventDefault: vi.fn(),
      nativeEvent: {
        offsetX: 10,
        offsetY: 10,
      } as unknown as MouseEvent,
    } as unknown as React.DragEvent<HTMLDivElement>;

    act(() => {
      result.current.dragHandlers.onDragStart("0,0:1", dragEvent);
    });

    // Can drop on occupied tiles for swapping
    expect(result.current.isValidDropTarget("0,0:2")).toBe(true); // Sibling
    expect(result.current.isValidDropTarget("0,0:3")).toBe(true); // Non-sibling at same level
    // Note: 0,0:3,1 might be blocked due to backend constraints with sibling's children
    
    // Check operation types
    expect(result.current.getDropOperation("0,0:2")).toBe("swap"); // Occupied
    expect(result.current.getDropOperation("0,0:4")).toBe("move"); // Empty
  });

  it("should update visual feedback based on operation type", () => {
    const tile1 = createMockTile("0,0:1", "123");
    const tile2 = createMockTile("0,0:2", "123");
    const rootTile = createMockTile("0,0", "123");
    
    const cacheState: CacheState = {
      itemsById: {
        "0,0": rootTile,
        "0,0:1": tile1,
        "0,0:2": tile2,
      },
      expandedItemIds: [],
      currentCenter: "0,0",
      isLoading: false,
      error: null,
      cacheConfig: {
        maxAge: 300000,
        backgroundRefreshInterval: 60000,
        enableOptimisticUpdates: true,
        maxDepth: 3,
      },
      regionMetadata: {},
      lastUpdated: Date.now(),
    };

    const { result } = renderHook(() =>
      useDragAndDrop({
        cacheState,
        currentUserId: 123,
        moveMapItemMutation: mockMutation,
        updateCache: vi.fn(),
      })
    );

    // Start dragging
    const dragEvent = {
      dataTransfer: {
        effectAllowed: "move" as DataTransfer["effectAllowed"],
        setData: vi.fn(),
      } as unknown as DataTransfer,
      clientX: 100,
      clientY: 100,
      preventDefault: vi.fn(),
      nativeEvent: {
        offsetX: 10,
        offsetY: 10,
      } as unknown as MouseEvent,
    } as unknown as React.DragEvent<HTMLDivElement>;

    act(() => {
      result.current.dragHandlers.onDragStart("0,0:1", dragEvent);
    });

    // Drag over empty position
    const dragOverEvent = {
      preventDefault: vi.fn(),
      dataTransfer: {
        dropEffect: "move" as DataTransfer["dropEffect"],
      } as unknown as DataTransfer,
    } as unknown as React.DragEvent<HTMLDivElement>;

    act(() => {
      result.current.dragHandlers.onDragOver("0,0:3", dragOverEvent);
    });

    expect(result.current.dragState.dropTargetId).toBe("0,0:3");
    expect(result.current.dragState.dropOperation).toBe("move");

    // Drag over occupied position
    act(() => {
      result.current.dragHandlers.onDragOver("0,0:2", dragOverEvent);
    });

    expect(result.current.dragState.dropTargetId).toBe("0,0:2");
    expect(result.current.dragState.dropOperation).toBe("swap");
  });


  it("should prevent swapping a tile with its sibling's child", () => {
    const tile1 = createMockTile("0,0:1", "123"); // Tile at position 1
    const tile2 = createMockTile("0,0:2", "123"); // Sibling at position 2
    const tile2Child = createMockTile("0,0:2,1", "123"); // Child of sibling
    const rootTile = createMockTile("0,0", "123");
    
    const cacheState: CacheState = {
      itemsById: {
        "0,0": rootTile,
        "0,0:1": tile1,
        "0,0:2": tile2,
        "0,0:2,1": tile2Child,
      },
      expandedItemIds: [],
      currentCenter: "0,0",
      isLoading: false,
      error: null,
      cacheConfig: {
        maxAge: 300000,
        backgroundRefreshInterval: 60000,
        enableOptimisticUpdates: true,
        maxDepth: 3,
      },
      regionMetadata: {},
      lastUpdated: Date.now(),
    };

    const { result } = renderHook(() =>
      useDragAndDrop({
        cacheState,
        currentUserId: 123,
        moveMapItemMutation: mockMutation,
        updateCache: vi.fn(),
      })
    );

    // Start dragging tile1
    const dragEvent = {
      dataTransfer: {
        effectAllowed: "move" as DataTransfer["effectAllowed"],
        setData: vi.fn(),
      } as unknown as DataTransfer,
      clientX: 100,
      clientY: 100,
      preventDefault: vi.fn(),
      nativeEvent: {
        offsetX: 10,
        offsetY: 10,
      } as unknown as MouseEvent,
    } as unknown as React.DragEvent<HTMLDivElement>;

    act(() => {
      result.current.dragHandlers.onDragStart("0,0:1", dragEvent);
    });

    // Should not be able to drop on sibling's child
    expect(result.current.isValidDropTarget("0,0:2,1")).toBe(false);
    
    // But should still be able to drop on the sibling itself
    expect(result.current.isValidDropTarget("0,0:2")).toBe(true);
    
    // And on other unrelated positions
    expect(result.current.isValidDropTarget("0,0:3")).toBe(true);
  });
});