import { useState, useCallback } from "react";
import type { DragEvent } from "react";
import { cacheSelectors } from "~/app/map/Cache/State/selectors";
import { canDragTile } from "./_validators";
import { isValidDropTarget, getDropOperationType } from "./_calculators";
import { performOptimisticMove } from "./_orchestrators";
import {
  setupDragStart,
  setupDragOver,
  handleDropEvent,
  createDragState,
  updateDropTarget,
} from "./_coordinators";
import type {
  DragState,
  UseDragAndDropConfig,
  UseDragAndDropReturn,
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

export function useDragAndDrop({
  cacheState,
  currentUserId,
  moveMapItemMutation,
  onMoveComplete,
  onMoveError,
  updateCache,
}: UseDragAndDropConfig): UseDragAndDropReturn {
  const [dragState, setDragState] = useState<DragState>(initialDragState);
  const selectors = cacheSelectors(cacheState);

  const checkCanDrag = useCallback((coordId: string): boolean => {
    const tile = selectors.getItem(coordId);
    return canDragTile(tile, currentUserId);
  }, [selectors, currentUserId]);

  const checkDropTarget = useCallback((targetCoordId: string): boolean => {
    return isValidDropTarget(targetCoordId, dragState.draggedTileId, selectors, currentUserId);
  }, [dragState.draggedTileId, selectors, currentUserId]);

  const handleDragStart = useCallback((coordId: string, event: DragEvent<HTMLDivElement>) => {
    if (!checkCanDrag(coordId)) {
      event.preventDefault();
      return;
    }
    
    const tile = selectors.getItem(coordId);
    if (!tile) {
      return;
    }
    
    setDragState(createDragState(coordId, tile, event));
    setupDragStart(event, coordId);
  }, [checkCanDrag, selectors]);

  const handleDragOver = useCallback((targetCoordId: string, event: DragEvent<HTMLDivElement>) => {
    const isValid = checkDropTarget(targetCoordId);
    setupDragOver(event, isValid);
    
    if (isValid) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const operation: DropOperation = getDropOperationType(targetCoordId, selectors);
      setDragState(prev => ({
        ...updateDropTarget(prev, targetCoordId),
        dropOperation: operation
      }));
    }
  }, [checkDropTarget, selectors]);

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
    
    // Determine operation type
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const operation: DropOperation = getDropOperationType(targetCoordId, selectors);
    
    if (operation === 'move') {
      // Perform the move asynchronously without blocking
      void performOptimisticMove({
        tile: dragState.draggedTileData,
        newCoordsId: targetCoordId,
        cacheState,
        selectors,
        updateCache,
        moveMapItemMutation,
        onMoveComplete,
        onMoveError,
      });
    } else {
      // Perform swap operation - the moveMapItem API handles swapping automatically
      // when moving to an occupied position
      void performOptimisticMove({
        tile: dragState.draggedTileData,
        newCoordsId: targetCoordId,
        cacheState,
        selectors,
        updateCache,
        moveMapItemMutation,
        onMoveComplete,
        onMoveError,
      });
    }
    
    // Reset drag state
    setDragState(initialDragState);
  }, [dragState.draggedTileData, checkDropTarget, cacheState, selectors, updateCache, moveMapItemMutation, onMoveComplete, onMoveError]);

  const handleDragEnd = useCallback(() => {
    setDragState(initialDragState);
  }, []);

  const getDropOperation = useCallback((coordId: string): 'move' | 'swap' | null => {
    if (!dragState.isDragging || !checkDropTarget(coordId)) {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    return getDropOperationType(coordId, selectors);
  }, [dragState.isDragging, checkDropTarget, selectors]);

  return {
    dragState,
    dragHandlers: {
      onDragStart: handleDragStart,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
      onDragEnd: handleDragEnd,
    },
    canDragTile: checkCanDrag,
    isValidDropTarget: checkDropTarget,
    isDraggingTile: (id: string) => dragState.draggedTileId === id,
    isDropTarget: (id: string) => dragState.dropTargetId === id,
    isDragging: dragState.isDragging,
    getDropOperation,
  };
}