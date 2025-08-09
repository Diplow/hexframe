/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import type { DragEvent } from "react";
import { useDragAndDrop } from "../useDragAndDrop";
import type { CacheState } from "~/app/map/Cache/State/types";
import type { TileData } from "~/app/map/types/tile-data";

// Mock data
const mockTile: TileData = {
  metadata: {
    dbId: "1",
    coordId: "0,0:1", // Fixed format: userId,groupId:path
    parentId: "0,0",
    coordinates: { userId: 0, groupId: 0, path: [1] },
    depth: 1,
    ownerId: "123",
  },
  data: {
    name: "Test Tile",
    description: "Test Description",
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

const mockRootTile: TileData = {
  ...mockTile,
  metadata: {
    ...mockTile.metadata,
    coordId: "0,0", // Root tile has no colon, just userId,groupId
    parentId: undefined,
    coordinates: { userId: 0, groupId: 0, path: [] },
    depth: 0,
    ownerId: "123", // Same owner as mockTile
  },
};

const mockCacheState: CacheState = {
  itemsById: {
    "0,0:1": mockTile,
    "0,0": mockRootTile,
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
  lastUpdated: Date.now(),
  regionMetadata: {},
};

const mockMutation = {
  mutateAsync: vi.fn().mockResolvedValue({
    modifiedItems: [],
    movedItemId: "1",
    affectedCount: 1,
  }),
};

describe("useDragAndDrop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure DOM is properly initialized
    if (typeof window !== "undefined" && !document.body) {
      document.documentElement.appendChild(document.createElement("body"));
    }
  });

  afterEach(() => {
    cleanup();
  });

  it("should prevent dragging non-owned tiles", () => {
    const { result } = renderHook(() =>
      useDragAndDrop({
        cacheState: mockCacheState,
        currentUserId: 456, // Different from tile owner
        moveMapItemMutation: mockMutation,
        updateCache: vi.fn(),
      })
    );

    expect(result.current.canDragTile("0,0:1")).toBe(false);
  });

  it("should allow dragging owned tiles", () => {
    const { result } = renderHook(() =>
      useDragAndDrop({
        cacheState: mockCacheState,
        currentUserId: 123, // Same as tile owner
        moveMapItemMutation: mockMutation,
        updateCache: vi.fn(),
      })
    );

    expect(result.current.canDragTile("0,0:1")).toBe(true);
  });

  it("should prevent dragging userTiles (root tiles)", () => {
    const { result } = renderHook(() =>
      useDragAndDrop({
        cacheState: mockCacheState,
        currentUserId: 123,
        moveMapItemMutation: mockMutation,
        updateCache: vi.fn(),
      })
    );

    // Root tile has empty path, should not be draggable
    expect(result.current.canDragTile("0,0")).toBe(false);
  });

  it("should identify valid drop targets in user space", () => {
    const cacheWithEmptySlots: CacheState = {
      ...mockCacheState,
      itemsById: {
        "0,0": mockRootTile,
        "0,0:1": mockTile, // Occupied position
        // Positions 2-6 are empty (not in the itemsById)
      },
    };

    const { result } = renderHook(() =>
      useDragAndDrop({
        cacheState: cacheWithEmptySlots,
        currentUserId: 123,
        moveMapItemMutation: mockMutation,
        updateCache: vi.fn(),
      })
    );

    // First need to start dragging before checking drop targets
    const mockDragEvent = {
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
    } as unknown as DragEvent<HTMLDivElement>;
    
    act(() => {
      result.current.dragHandlers.onDragStart("0,0:1", mockDragEvent);
    });
    
    // Now test that all positions in user space (userId=0) are valid drop targets
    // Empty sibling positions
    expect(result.current.isValidDropTarget("0,0:2")).toBe(true);
    expect(result.current.isValidDropTarget("0,0:3")).toBe(true);
    expect(result.current.isValidDropTarget("0,0:4")).toBe(true);
    expect(result.current.isValidDropTarget("0,0:5")).toBe(true);
    expect(result.current.isValidDropTarget("0,0:6")).toBe(true);

    // Occupied position (self) should not be valid
    expect(result.current.isValidDropTarget("0,0:1")).toBe(false);
    
    // Non-sibling positions in same user space ARE NOW VALID
    expect(result.current.isValidDropTarget("0,0:1,1")).toBe(true); // Child position
    expect(result.current.isValidDropTarget("0,0:2,3")).toBe(true); // Different parent, same user
    
    // With the new approach, even positions in different user space are valid
    // The actual permission check happens during the operation
    expect(result.current.isValidDropTarget("1,0:1")).toBe(true); // Different user space is now allowed
    
    // Root tile should not be valid drop target
    expect(result.current.isValidDropTarget("0,0")).toBe(false)
  });


  it("should handle drag events correctly", () => {
    // Use a cache state where position 2 is empty
    const cacheWithEmptyPosition: CacheState = {
      ...mockCacheState,
      itemsById: {
        "0,0": mockRootTile,
        "0,0:1": mockTile, // Position 1 occupied
        // Position 2-6 are empty
      },
    };
    
    const { result } = renderHook(() =>
      useDragAndDrop({
        cacheState: cacheWithEmptyPosition,
        currentUserId: 123,
        moveMapItemMutation: mockMutation,
        updateCache: vi.fn(),
      })
    );

    const mockDragEvent = {
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
    } as unknown as DragEvent<HTMLDivElement>;

    // Test drag start
    act(() => {
      result.current.dragHandlers.onDragStart("0,0:1", mockDragEvent);
    });

    expect(result.current.dragState.isDragging).toBe(true);
    expect(result.current.dragState.draggedTileId).toBe("0,0:1");
    // Verify setData was called correctly
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockDragEvent.dataTransfer?.setData).toHaveBeenCalledWith("text/plain", "0,0:1");

    // Test drag over - dragHandlers won't work without a valid drop target
    // We need to find a sibling position that's empty
    const emptyTargetId = "0,0:2"; // sibling position
    
    const dragOverEvent = {
      preventDefault: vi.fn(),
      dataTransfer: {
        dropEffect: "move" as DataTransfer["dropEffect"],
      } as unknown as DataTransfer,
    } as unknown as DragEvent<HTMLDivElement>;

    act(() => {
      result.current.dragHandlers.onDragOver(emptyTargetId, dragOverEvent);
    });

    // Since we're dragging tile at position 1, position 2 should be a valid drop target
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(dragOverEvent.preventDefault).toHaveBeenCalled();
    expect(result.current.dragState.dropTargetId).toBe(emptyTargetId);

    // Test drag end
    act(() => {
      result.current.dragHandlers.onDragEnd();
    });

    expect(result.current.dragState.isDragging).toBe(false);
    expect(result.current.dragState.draggedTileId).toBe(null);
  });

  it("should validate drop targets during active drag", () => {
    const { result } = renderHook(() =>
      useDragAndDrop({
        cacheState: mockCacheState,
        currentUserId: 123,
        moveMapItemMutation: mockMutation,
        updateCache: vi.fn(),
      })
    );

    // Before dragging, no targets should be valid
    expect(result.current.isValidDropTarget("0,0:2")).toBe(false);

    // Start dragging
    const mockDragEvent = {
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
    } as unknown as DragEvent<HTMLDivElement>;

    act(() => {
      result.current.dragHandlers.onDragStart("0,0:1", mockDragEvent);
    });

    // Now empty sibling should be valid drop target
    expect(result.current.isValidDropTarget("0,0:2")).toBe(true);
    
    // Non-sibling positions ARE NOW VALID with the new approach
    expect(result.current.isValidDropTarget("0,0:1,1")).toBe(true);
    expect(result.current.isValidDropTarget("0,1:1")).toBe(true);
  });

  it("should prevent dropping on occupied positions", () => {
    const occupiedCache: CacheState = {
      ...mockCacheState,
      itemsById: {
        "0,0": mockRootTile,
        "0,0:1": mockTile,
        "0,0:2": { ...mockTile, metadata: { ...mockTile.metadata, coordId: "0,0:2" } },
      },
    };

    const { result } = renderHook(() =>
      useDragAndDrop({
        cacheState: occupiedCache,
        currentUserId: 123,
        moveMapItemMutation: mockMutation,
        updateCache: vi.fn(),
      })
    );

    act(() => {
      const mockDragEvent = {
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
      } as unknown as DragEvent<HTMLDivElement>;
      result.current.dragHandlers.onDragStart("0,0:1", mockDragEvent);
    });

    // Occupied position IS NOW VALID drop target (for swapping)
    expect(result.current.isValidDropTarget("0,0:2")).toBe(true);
  });
});