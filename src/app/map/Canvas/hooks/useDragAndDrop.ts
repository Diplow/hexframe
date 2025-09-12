import { useState, useCallback, useMemo } from "react";
import type { DragEvent } from "react";
import { useUnifiedAuth } from "~/contexts/UnifiedAuthContext";
import { useMapCache } from '~/app/map/Cache';
import { useEventBus } from '~/app/map';
import { canDragTile } from "~/app/map/Canvas/hooks/_internals/_validators";
import { isValidDropTarget } from "~/app/map/Canvas/hooks/_internals/_calculators";
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
  
  // Move hooks to the main hook function
  const checkCanDrag = useCallback((coordId: string): boolean => {
    const tile = getItem(coordId);
    return canDragTile(tile, mappingUserId ?? null);
  }, [getItem, mappingUserId]);

  const checkDropTarget = useCallback((targetCoordId: string): boolean => {
    return isValidDropTarget(targetCoordId, dragState.draggedTileId, getItem, mappingUserId ?? null);
  }, [dragState.draggedTileId, getItem, mappingUserId]);

  const validationCallbacks = useMemo(() => ({ checkCanDrag, checkDropTarget }), [checkCanDrag, checkDropTarget]);
  
  // Move all event handlers to main hook to avoid rules of hooks violations
  const handleDragStart = useCallback((coordId: string, event: DragEvent<HTMLDivElement>) => {
    if (!validationCallbacks.checkCanDrag(coordId)) {
      event.preventDefault();
      return;
    }

    const tileData = getItem(coordId);
    if (!tileData) {
      event.preventDefault();
      return;
    }

    setupDragStart(event, coordId);
    const newDragState = createDragState(coordId, tileData, event);
    setDragState(newDragState);
  }, [validationCallbacks, getItem, setDragState]);

  const handleDragOver = useCallback((targetCoordId: string, event: DragEvent<HTMLDivElement>) => {
    if (!dragState.isDragging) return;
    if (!validationCallbacks.checkDropTarget(targetCoordId)) {
      event.dataTransfer.dropEffect = 'none';
      return;
    }

    setupDragOver(event, true);
    setDragState(prev => updateDropTarget(prev, targetCoordId));
  }, [dragState, validationCallbacks, setDragState]);

  const handleDragLeave = useCallback(() => {
    setDragState(prev => updateDropTarget(prev, null));
  }, [setDragState]);

  const handleDrop = useCallback((targetCoordId: string, event: DragEvent<HTMLDivElement>) => {
    _executeDropOperation(targetCoordId, event, dragState, validationCallbacks, moveItemOptimistic, eventBus, setDragState);
  }, [dragState, validationCallbacks, moveItemOptimistic, eventBus, setDragState]);

  const handleDragEnd = useCallback(() => {
    setDragState(initialDragState);
  }, [setDragState]);

  const eventHandlers = { handleDragStart, handleDragOver, handleDragLeave, handleDrop, handleDragEnd };
  const stateQueries = _createStateQueries(dragState);
  const dragHandlers = _createDragHandlers(eventHandlers);
  
  return _createHookReturnValue(dragHandlers, validationCallbacks, stateQueries, dragState);
}

// Internal helper functions for drag and drop logic



function _executeDropOperation(
  targetCoordId: string,
  event: DragEvent<HTMLDivElement>,
  dragState: DragState,
  validationCallbacks: {
    checkCanDrag: (id: string) => boolean;
    checkDropTarget: (id: string) => boolean;
  },
  moveItemOptimistic: ReturnType<typeof useMapCache>['moveItemOptimistic'],
  eventBus: ReturnType<typeof useEventBus>,
  setDragState: React.Dispatch<React.SetStateAction<DragState>>
) {
  event.preventDefault();
  
  if (!dragState.isDragging || !dragState.draggedTileId) return;
  if (!validationCallbacks.checkDropTarget(targetCoordId)) return;

  handleDropEvent(event);
  
  const sourceCoordId = dragState.draggedTileId;
  if (sourceCoordId) {
    void (async () => {
      try {
        await moveItemOptimistic(sourceCoordId, targetCoordId);
      } catch (error) {
        eventBus.emit({
          type: 'error.occurred',
          source: 'map_cache',
          payload: {
            error: error instanceof Error ? error.message : 'Failed to complete operation',
            context: {
              operation: 'move',
              sourceCoordId,
              targetCoordId
            },
            retryable: true
          },
          timestamp: new Date(),
        });
      }
    })();
  }

  setDragState(initialDragState);
}

function _createStateQueries(dragState: DragState) {
  const isDraggingTile = (id: string): boolean => {
    return dragState.isDragging && dragState.draggedTileId === id;
  };

  const isDropTarget = (id: string): boolean => {
    return dragState.dropTargetId === id;
  };

  const getDropOperation = (id: string): DropOperation | null => {
    if (dragState.dropTargetId === id) {
      return dragState.dropOperation;
    }
    return null;
  };

  return { isDraggingTile, isDropTarget, getDropOperation };
}

function _createDragHandlers(eventHandlers: {
  handleDragStart: (coordId: string, event: DragEvent<HTMLDivElement>) => void;
  handleDragOver: (targetCoordId: string, event: DragEvent<HTMLDivElement>) => void;
  handleDragLeave: () => void;
  handleDrop: (targetCoordId: string, event: DragEvent<HTMLDivElement>) => void;
  handleDragEnd: () => void;
}): DragHandlers {
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
  validationCallbacks: {
    checkCanDrag: (id: string) => boolean;
    checkDropTarget: (id: string) => boolean;
  },
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