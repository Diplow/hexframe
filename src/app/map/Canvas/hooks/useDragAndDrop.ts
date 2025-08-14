import { useState, useCallback } from "react";
import type { DragEvent } from "react";
import { useUnifiedAuth } from "~/contexts/UnifiedAuthContext";
import { useMapCache } from '~/app/map/Cache/interface';
import { useEventBus } from "../../Services/EventBus/event-bus-context";
import { canDragTile } from "./_validators";
import { isValidDropTarget, getDropOperationType } from "./_calculators";
import {
  setupDragStart,
  setupDragOver,
  handleDropEvent,
  createDragState,
  updateDropTarget,
} from "./_coordinators";
import type {
  DragState,
  DragHandlers,
  DropOperation,
} from "./types";

const initialDragState: DragState = {
  isDragging: false,
  draggedTileId: null,
  draggedTileData: null,
  dropTargetId: null,
  dropOperation: null,
  dragOffset: { x: 0, y: 0 },
};

export interface UseDragAndDropReturn {
  dragHandlers: DragHandlers;
  canDragTile: (id: string) => boolean;
  isValidDropTarget: (id: string) => boolean;
  isDraggingTile: (id: string) => boolean;
  isDropTarget: (id: string) => boolean;
  isDragging: boolean;
  getDropOperation: (id: string) => DropOperation | null;
}

/**
 * Hook that provides drag and drop functionality for map tiles
 * Integrates directly with the map cache for optimistic updates
 */
export function useDragAndDrop(): UseDragAndDropReturn {
  const { mappingUserId } = useUnifiedAuth();
  const eventBus = useEventBus();
  const { getItem, moveItemOptimistic } = useMapCache();
  const [dragState, setDragState] = useState<DragState>(initialDragState);

  const checkCanDrag = useCallback((coordId: string): boolean => {
    const tile = getItem(coordId);
    return canDragTile(tile, mappingUserId ?? null);
  }, [getItem, mappingUserId]);

  const checkDropTarget = useCallback((targetCoordId: string): boolean => {
    return isValidDropTarget(targetCoordId, dragState.draggedTileId, getItem, mappingUserId ?? null);
  }, [dragState.draggedTileId, getItem, mappingUserId]);

  const handleDragStart = useCallback((coordId: string, event: DragEvent<HTMLDivElement>) => {
    if (!checkCanDrag(coordId)) {
      event.preventDefault();
      return;
    }
    
    setupDragStart(event, coordId);
    const tile = getItem(coordId);
    if (tile) {
      setDragState(createDragState(coordId, tile, event));
    }
  }, [checkCanDrag, getItem]);

  const handleDragOver = useCallback((targetCoordId: string, event: DragEvent<HTMLDivElement>) => {
    const isValid = checkDropTarget(targetCoordId);
    setupDragOver(event, isValid);
    
    if (isValid) {
      const operation: DropOperation = getDropOperationType(targetCoordId, getItem);
      setDragState(prev => ({
        ...updateDropTarget(prev, targetCoordId),
        dropOperation: operation
      }));
    }
  }, [checkDropTarget, getItem]);

  const handleDragLeave = useCallback(() => {
    setDragState(prev => ({
      ...updateDropTarget(prev, null),
      dropOperation: null
    }));
  }, []);

  const handleDrop = useCallback((targetCoordId: string, event: DragEvent<HTMLDivElement>) => {
    handleDropEvent(event);
    
    if (!dragState.draggedTileData || !checkDropTarget(targetCoordId)) {
      return;
    }
    
    // Get the source coordinates from the dragged tile
    const sourceCoordId = dragState.draggedTileId;
    if (!sourceCoordId) {
      return;
    }
    
    const sourceItem = getItem(sourceCoordId);
    const targetItem = getItem(targetCoordId);
    
    if (!sourceItem) return;
    
    // Perform the move/swap operation
    void (async () => {
      try {
        // Use moveItemOptimistic from mapCache
        // This will trigger the mutation coordinator which emits the appropriate events
        await moveItemOptimistic(sourceCoordId, targetCoordId);
      } catch (error) {
        console.error('Failed to move/swap tiles:', error);
        
        // Emit error event for Chat to display
        eventBus.emit({
          type: 'error.occurred',
          source: 'map_cache',
          payload: {
            error: error instanceof Error ? error.message : 'Failed to complete operation',
            context: {
              operation: targetItem ? 'swap' : 'move',
              sourceItem: sourceItem.data.name,
              targetItem: targetItem?.data.name
            },
            retryable: true
          },
          timestamp: new Date(),
        });
      }
    })();
    
    // Reset drag state
    setDragState(initialDragState);
  }, [dragState.draggedTileData, dragState.draggedTileId, checkDropTarget, getItem, moveItemOptimistic, eventBus]);

  const handleDragEnd = useCallback(() => {
    setDragState(initialDragState);
  }, []);

  const dragHandlers: DragHandlers = {
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
    onDragEnd: handleDragEnd,
  };

  const isDraggingTile = useCallback((id: string): boolean => {
    return dragState.isDragging && dragState.draggedTileId === id;
  }, [dragState.isDragging, dragState.draggedTileId]);

  const isDropTarget = useCallback((id: string): boolean => {
    return dragState.dropTargetId === id;
  }, [dragState.dropTargetId]);

  const getDropOperation = useCallback((id: string): DropOperation | null => {
    if (dragState.dropTargetId === id) {
      return dragState.dropOperation;
    }
    return null;
  }, [dragState.dropTargetId, dragState.dropOperation]);

  return {
    dragHandlers,
    canDragTile: checkCanDrag,
    isValidDropTarget: checkDropTarget,
    isDraggingTile,
    isDropTarget,
    isDragging: dragState.isDragging,
    getDropOperation,
  };
}