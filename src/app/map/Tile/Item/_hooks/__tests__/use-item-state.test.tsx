import '~/test/setup'; // Import test setup FIRST
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import { useItemState } from "../use-item-state";
import type { TileData } from "~/app/map/types/tile-data";
import { LegacyTileActionsContext } from "~/app/map/Canvas";

// Mock the dependencies
vi.mock("../use-item-interaction", () => ({
  useItemInteraction: () => ({
    isDraggable: true,
    isBeingDragged: false,
    isValidDropTarget: false,
    isDropTargetActive: false,
    dropOperation: null,
  }),
}));

vi.mock("../use-item-dialogs", () => ({
  useItemDialogs: () => ({
    isUpdateDialogOpen: false,
    isDeleteDialogOpen: false,
    openUpdateDialog: vi.fn(),
    closeUpdateDialog: vi.fn(),
    openDeleteDialog: vi.fn(),
    closeDeleteDialog: vi.fn(),
  }),
}));

vi.mock("../../_utils", () => ({
  generateTileTestId: (coords: { path: number[] }) => `tile-${coords.path.join("-")}`,
}));

vi.mock("../../_validators", () => ({
  canEditTile: (currentUserId?: number, ownerId?: string) => {
    return currentUserId !== undefined && String(currentUserId) === ownerId;
  },
}));

vi.mock("../../_coordinators", () => ({
  createDragProps: (_coordId: string, _actions: unknown, isDraggable: boolean) => ({
    draggable: isDraggable,
    onDragStart: vi.fn(),
    onDragEnd: vi.fn(),
  }),
  createDropProps: () => ({}),
  getSwapPreviewColor: () => "transparent",
}));

describe("useItemState - Drag Functionality", () => {
  const createMockTile = (ownerId: string): TileData => ({
    metadata: {
      coordId: "1,0:1",
      dbId: "item-1",
      ownerId,
      coordinates: {
        userId: 1,
        groupId: 0,
        path: [1],
      },
      depth: 1,
      parentId: undefined,
    },
    data: {
      name: "Test Tile",
      description: "Test Description",
      url: "",
      color: "blue",
    },
    state: {
      isDragged: false,
      isHovered: false,
      isSelected: false,
      isExpanded: false,
      isDragOver: false,
      isHovering: false,
      canExpand: true,
      canEdit: true,
    },
  });

  const mockTileActions = {
    handleTileClick: vi.fn(),
    handleTileHover: vi.fn(),
    dragHandlers: {
      onDragStart: vi.fn(),
      onDragOver: vi.fn(),
      onDragLeave: vi.fn(),
      onDrop: vi.fn(),
      onDragEnd: vi.fn(),
    },
    canDragTile: () => true,
    isDraggingTile: () => false,
    isDropTarget: () => false,
    isValidDropTarget: () => false,
    isDragging: false,
    getDropOperation: () => null,
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <LegacyTileActionsContext.Provider value={mockTileActions}>
      {children}
    </LegacyTileActionsContext.Provider>
  );

  it("should make owned tiles draggable regardless of active tool", () => {
    const currentUserId = 123;
    const tile = createMockTile("123"); // Owned by current user

    const { result } = renderHook(
      () =>
        useItemState({
          item: tile,
          currentUserId,
          interactive: true,
          allExpandedItemIds: [],
          hasChildren: false,
          isCenter: false,
          scale: 1,
        }),
      { wrapper }
    );

    // The tile should be draggable because the user owns it
    expect(result.current.dragProps.draggable).toBe(true);
    expect(result.current.canEdit).toBe(true);
  });

  it("should not make tiles draggable when user does not own them", () => {
    const currentUserId = 123;
    const tile = createMockTile("456"); // Owned by different user

    const { result } = renderHook(
      () =>
        useItemState({
          item: tile,
          currentUserId,
          interactive: true,
          allExpandedItemIds: [],
          hasChildren: false,
          isCenter: false,
          scale: 1,
        }),
      { wrapper }
    );

    // The tile should not be draggable because the user doesn't own it
    expect(result.current.dragProps.draggable).toBe(false);
    expect(result.current.canEdit).toBe(false);
  });

  it("should not make tiles draggable when interactive is false", () => {
    const currentUserId = 123;
    const tile = createMockTile("123"); // Owned by current user

    const { result } = renderHook(
      () =>
        useItemState({
          item: tile,
          currentUserId,
          interactive: false, // Non-interactive mode
          allExpandedItemIds: [],
          hasChildren: false,
          isCenter: false,
          scale: 1,
        }),
      { wrapper }
    );

    // The tile should not be draggable in non-interactive mode
    expect(result.current.dragProps.draggable).toBe(false);
  });
});