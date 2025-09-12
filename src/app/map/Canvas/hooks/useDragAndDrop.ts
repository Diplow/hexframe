import { useState, useCallback } from "react";
import type { DragEvent } from "react";
import { useUnifiedAuth } from "~/contexts/UnifiedAuthContext";
import { useMapCache } from '~/app/map/Cache';
import { useEventBus } from '~/app/map';
import { canDragTile } from "~/app/map/Canvas/hooks/_internals/_validators";
import { isValidDropTarget, getDropOperationType } from "~/app/map/Canvas/hooks/_internals/_calculators";
import {
  setupDragStart,
  setupDragOver,
  handleDropEvent,
  createDragState,
  updateDropTarget,
} from "~/app/map/Canvas/hooks/_internals/_coordinators";
import type {
  DragState,
  DragHandlers,
  DropOperation,
} from "~/app/map/Canvas/hooks/types";

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

  const validationCallbacks = _createValidationCallbacks(getItem, dragState, mappingUserId);
  const eventHandlers = _createEventHandlers(
    validationCallbacks, 
    dragState, 
    setDragState, 
    getItem, 
    moveItemOptimistic, 
    eventBus
  );
  const stateQueries = _createStateQueries(dragState);
  const dragHandlers = _createDragHandlers(eventHandlers);
  
  return _createHookReturnValue(dragHandlers, validationCallbacks, stateQueries, dragState);
}

// Internal helper functions for drag and drop logic

function _createValidationCallbacks(
  getItem: ReturnType<typeof useMapCache>['getItem'],
  dragState: DragState,
  mappingUserId: number | null | undefined
) {
  const checkCanDrag = useCallback((coordId: string): boolean => {
    const tile = getItem(coordId);
    return canDragTile(tile, mappingUserId ?? null);
  }, [getItem, mappingUserId]);

  const checkDropTarget = useCallback((targetCoordId: string): boolean => {
    return isValidDropTarget(targetCoordId, dragState.draggedTileId, getItem, mappingUserId ?? null);
  }, [dragState.draggedTileId, getItem, mappingUserId]);

  return { checkCanDrag, checkDropTarget };
}

function _createEventHandlers(
  validationCallbacks: ReturnType<typeof _createValidationCallbacks>,
  dragState: DragState,
  setDragState: React.Dispatch<React.SetStateAction<DragState>>,
  getItem: ReturnType<typeof useMapCache>['getItem'],
  moveItemOptimistic: ReturnType<typeof useMapCache>['moveItemOptimistic'],
  eventBus: ReturnType<typeof useEventBus>
) {
  const handleDragStart = useCallback((coordId: string, event: DragEvent<HTMLDivElement>) => {
    if (!validationCallbacks.checkCanDrag(coordId)) {
      event.preventDefault();
      return;
    }
    
    setupDragStart(event, coordId);
    const tile = getItem(coordId);
    if (tile) {
      setDragState(createDragState(coordId, tile, event));
    }
  }, [validationCallbacks.checkCanDrag, getItem, setDragState]);

  const handleDragOver = useCallback((targetCoordId: string, event: DragEvent<HTMLDivElement>) => {
    const isValid = validationCallbacks.checkDropTarget(targetCoordId);
    setupDragOver(event, isValid);
    
    if (isValid) {
      const operation: DropOperation = getDropOperationType(targetCoordId, getItem);
      setDragState(prev => ({
        ...updateDropTarget(prev, targetCoordId),
        dropOperation: operation
      }));
    }
  }, [validationCallbacks.checkDropTarget, getItem, setDragState]);

  const handleDragLeave = useCallback(() => {
    setDragState(prev => ({
      ...updateDropTarget(prev, null),
      dropOperation: null
    }));
  }, [setDragState]);

  const handleDrop = useCallback((targetCoordId: string, event: DragEvent<HTMLDivElement>) => {
    _processDropOperation(
      event,
      targetCoordId,
      dragState,
      validationCallbacks.checkDropTarget,
      getItem,
      moveItemOptimistic,
      eventBus,
      setDragState
    );
  }, [dragState, validationCallbacks.checkDropTarget, getItem, moveItemOptimistic, eventBus, setDragState]);

  const handleDragEnd = useCallback(() => {
    setDragState(initialDragState);
  }, [setDragState]);

  return { handleDragStart, handleDragOver, handleDragLeave, handleDrop, handleDragEnd };
}

function _processDropOperation(
  event: DragEvent<HTMLDivElement>,
  targetCoordId: string,
  dragState: DragState,
  checkDropTarget: (id: string) => boolean,
  getItem: ReturnType<typeof useMapCache>['getItem'],
  moveItemOptimistic: ReturnType<typeof useMapCache>['moveItemOptimistic'],
  eventBus: ReturnType<typeof useEventBus>,
  setDragState: React.Dispatch<React.SetStateAction<DragState>>
) {
  handleDropEvent(event);
  
  if (!dragState.draggedTileData || !checkDropTarget(targetCoordId)) {
    return;
  }
  
  const sourceCoordId = dragState.draggedTileId;
  if (!sourceCoordId) return;
  
  const sourceItem = getItem(sourceCoordId);
  const targetItem = getItem(targetCoordId);
  
  if (!sourceItem) return;
  
  void (async () => {
    try {
      await moveItemOptimistic(sourceCoordId, targetCoordId);
    } catch (error) {
      _handleDropError(error, sourceItem, targetItem, eventBus);
    }
  })();
  
  setDragState(initialDragState);
}

function _handleDropError(
  error: unknown,
  sourceItem: any,
  targetItem: any,
  eventBus: ReturnType<typeof useEventBus>
) {
  console.error('Failed to move/swap tiles:', error);
  
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

function _createStateQueries(dragState: DragState) {
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

  return { isDraggingTile, isDropTarget, getDropOperation };
}

function _createDragHandlers(eventHandlers: ReturnType<typeof _createEventHandlers>): DragHandlers {
  return {
    onDragStart: eventHandlers.handleDragStart,
    onDragOver: eventHandlers.handleDragOver,
    onDragLeave: eventHandlers.handleDragLeave,
    onDrop: eventHandlers.handleDrop,
    onDragEnd: eventHandlers.handleDragEnd,
  };
}

function _createHookReturnValue(
  dragHandlers: DragHandlers,
  validationCallbacks: ReturnType<typeof _createValidationCallbacks>,
  stateQueries: ReturnType<typeof _createStateQueries>,
  dragState: DragState
): UseDragAndDropReturn {
  return {
    dragHandlers,
    canDragTile: validationCallbacks.checkCanDrag,
    isValidDropTarget: validationCallbacks.checkDropTarget,
    isDraggingTile: stateQueries.isDraggingTile,
    isDropTarget: stateQueries.isDropTarget,
    isDragging: dragState.isDragging,
    getDropOperation: stateQueries.getDropOperation,
  };
}