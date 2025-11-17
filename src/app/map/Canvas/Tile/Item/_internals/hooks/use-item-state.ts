"use client";

import { useEffect, useRef } from "react";
import type { DragEvent } from "react";
import type { TileData } from "~/app/map/types/tile-data";
import { useItemInteraction } from "~/app/map/Canvas/Tile/Item/_internals/hooks/use-item-interaction";
import { generateTileTestId } from "~/app/map/Canvas/Tile/Item/_internals/utils";
import { canEditTile } from "~/app/map/Canvas/Tile/Item/_internals/validators";
import { useMapCache } from "~/app/map/Cache";
import { useOperations } from "~/app/map/Operations";
import { testLogger } from "~/lib/test-logger";
import { canDragTile } from "~/app/map/Services";

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
  scale,
}: ItemStateProps) {
  const interaction = useItemInteraction(item.metadata.coordId);
  const { startDrag } = useMapCache();
  const { isOperationPending, getPendingOperationType } = useOperations();
  const tileRef = useRef<HTMLDivElement>(null);

  const canEdit = canEditTile(currentUserId, item.metadata.ownerId);
  const testId = generateTileTestId(item.metadata.coordinates);

  // Check if this tile has pending operations
  const hasOperationPending = isOperationPending(item.metadata.coordId);
  const operationType = getPendingOperationType(item.metadata.coordId);

  // Check if this tile can be dragged
  const isDraggable = interactive && canDragTile(item, currentUserId) && !hasOperationPending;

  // Create drag props with data attributes
  const dragProps = {
    draggable: isDraggable,
    onDragStart: (event: DragEvent<HTMLDivElement>) => {
      if (!isDraggable) {
        event.preventDefault();
        return;
      }

      // Guard against missing dataTransfer (e.g., in jsdom)
      const dataTransfer = event.dataTransfer || event.nativeEvent?.dataTransfer;
      if (!dataTransfer) {
        event.preventDefault();
        return;
      }

      startDrag(item.metadata.coordId, event.nativeEvent);
    },
  };

  // Data attributes for DOM-based drag detection
  const dataAttributes = {
    'data-tile-id': item.metadata.coordId,
    'data-tile-owner': item.metadata.ownerId?.toString() ?? '',
    'data-tile-has-content': 'true', // This tile has content (not empty)
  };

  // No drop props needed - global service handles detection automatically
  const dropProps = {};

  // Visual state (will be handled by CSS classes applied by global service)
  const tileColor = item.data.color;
  
  // Log tile rendering for E2E tests
  useEffect(() => {
    testLogger.component("DynamicItemTile", {
      testId,
      name: item.data.title,
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
    dataAttributes, // New: data attributes for global drag service
    tileColor,
    tileRef, // Ref for the tile element
    hasOperationPending, // Operation pending state
    operationType, // New: pending operation type
  };
}