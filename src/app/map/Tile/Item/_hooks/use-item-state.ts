"use client";

import { useContext, useEffect } from "react";
import type { TileData } from "~/app/map/types/tile-data";
import { LegacyTileActionsContext } from "~/app/map/Canvas";
import { useTileActions } from "~/app/map/Canvas/TileActionsContext";
import { useItemInteraction } from "./use-item-interaction";
import { useItemDialogs } from "./use-item-dialogs";
import { generateTileTestId } from "../_utils";
import { canEditTile } from "../_validators";
import { createDragProps, createDropProps, getSwapPreviewColor } from "../_coordinators";
import { testLogger } from "~/lib/test-logger";

interface ItemStateProps {
  item: TileData;
  currentUserId?: number;
  interactive: boolean;
  allExpandedItemIds: string[];
  hasChildren: boolean;
  isCenter: boolean;
  scale: number;
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
  scale
}: ItemStateProps) {
  const tileActions = useContext(LegacyTileActionsContext);
  const { activeTool } = useTileActions();
  const interaction = useItemInteraction(item.metadata.coordId);
  const dialogs = useItemDialogs();
  
  const canEdit = canEditTile(currentUserId, item.metadata.ownerId);
  const testId = generateTileTestId(item.metadata.coordinates);
  
  // Only allow dragging when the drag tool is active AND user can edit the tile
  const isDraggableWithTool = interaction.isDraggable && activeTool === 'drag' && canEdit;
  
  const dragProps = interactive 
    ? createDragProps(item.metadata.coordId, tileActions, isDraggableWithTool, interaction.isBeingDragged)
    : { draggable: false };
    
  const dropProps = interactive 
    ? createDropProps(item.metadata.coordId, tileActions, interaction.isValidDropTarget)
    : {};
    
  const tileColor = getSwapPreviewColor(item, interaction.isDropTargetActive, interaction.dropOperation);
  
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
    dialogs,
    canEdit,
    testId,
    dragProps,
    dropProps,
    tileColor,
  };
}