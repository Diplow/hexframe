"use client";

import { useEffect } from "react";
import type { TileData } from "~/app/map/types/tile-data";
import { useItemInteraction } from "~/app/map/Canvas/Tile/Item/_internals/hooks/use-item-interaction";
import { generateTileTestId } from "~/app/map/Canvas/Tile/Item/_internals/utils";
import { canEditTile } from "~/app/map/Canvas/Tile/Item/_internals/validators";
import { useTileRegistration } from "~/app/map/Services";
import { testLogger } from "~/lib/test-logger";
import type { UseDOMBasedDragReturn } from "~/app/map/Services";

interface ItemStateProps {
  item: TileData;
  currentUserId?: number;
  interactive: boolean;
  allExpandedItemIds: string[];
  hasChildren: boolean;
  isCenter: boolean;
  scale: number;
  domBasedDragService?: UseDOMBasedDragReturn;
}

/**
 * Combines all the state and prop calculation logic for an item tile
 * Encapsulates interaction state, permissions, and drag/drop props
 * 
 * @param item - The tile data
 * @param currentUserId - Current user ID for permissions
 * @param interactive - Whether the tile is interactive
 * @param allExpandedItemIds - List of expanded item IDs
 * @param hasChildren - Whether the item has children
 * @param isCenter - Whether this is the center tile
 * @param scale - The tile scale
 * @returns Complete state and props for the item tile
 */
export function useItemState({
  item,
  currentUserId,
  interactive,
  allExpandedItemIds,
  hasChildren,
  isCenter,
  scale,
  domBasedDragService
}: ItemStateProps) {
  const interaction = useItemInteraction(item.metadata.coordId);

  const canEdit = canEditTile(currentUserId, item.metadata.ownerId);
  const testId = generateTileTestId(item.metadata.coordinates);

  // DOM-based drag and drop integration
  const tileRef = useTileRegistration(item.metadata.coordId, domBasedDragService ?? null);

  // Get drag props from DOM-based service if available
  const dragProps = interactive && domBasedDragService
    ? domBasedDragService.createDragProps(item.metadata.coordId)
    : { draggable: false };

  // No drop props needed - DOM-based service handles detection automatically
  const dropProps = {};

  // Get drag state from DOM-based service
  const isBeingDragged = domBasedDragService ? domBasedDragService.isDraggingTile(item.metadata.coordId) : false;
  const isDropTarget = domBasedDragService ? domBasedDragService.isHoverTarget(item.metadata.coordId) : false;
  const dropOperation = domBasedDragService ? domBasedDragService.getDropOperation(item.metadata.coordId) : null;

  // Simplified color logic for DOM-based drag
  const tileColor = isDropTarget && dropOperation === 'move' ? 'transparent' : item.data.color;
  
  // Log tile rendering for E2E tests
  useEffect(() => {
    testLogger.component("DynamicItemTile", {
      testId,
      name: item.data.name,
      dbId: item.metadata.dbId,
      coordinates: item.metadata.coordId,
      isExpanded: allExpandedItemIds.includes(item.metadata.dbId),
      hasChildren,
      isCenter,
      scale,
    });
  }, [item, testId, allExpandedItemIds, hasChildren, isCenter, scale]);
  
  return {
    interaction,
    canEdit,
    testId,
    dragProps,
    dropProps,
    tileColor,
    tileRef, // New: ref for DOM-based drag registration
    isBeingDragged, // New: drag state from DOM service
    isDropTarget, // New: drop target state from DOM service
  };
}