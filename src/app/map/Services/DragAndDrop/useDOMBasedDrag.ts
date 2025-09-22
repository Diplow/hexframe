"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import type { DragEvent } from "react";
import { useUnifiedAuth } from "~/contexts/UnifiedAuthContext";
import { useMapCache } from '~/app/map/Cache';
import { useEventBus } from '~/app/map';
import { DOMBasedDragService, type DragState } from "~/app/map/Services/DragAndDrop/DOMBasedDragService";
import { validateDragOperation, canDragTile } from "~/app/map/Services/DragAndDrop/_validators/drag-validators";

export interface UseDOMBasedDragReturn {
  // For draggable tiles
  createDragProps: (coordId: string) => {
    draggable: boolean;
    onDragStart: (event: DragEvent<HTMLDivElement>) => void;
    onDragEnd: () => void;
  };

  // For potential drop targets (including empty tiles)
  registerTile: (coordId: string, element: HTMLElement) => void;
  unregisterTile: (coordId: string) => void;

  // State queries
  isDraggingTile: (id: string) => boolean;
  isHoverTarget: (id: string) => boolean;
  isDragging: boolean;
  getDropOperation: (id: string) => 'move' | 'swap' | null;

  // Global drop handler (attach to document or canvas container)
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
}

/**
 * Hook that provides DOM-based drag and drop functionality for map tiles
 * Decouples tiles from drag logic by using geometric detection
 */
export function useDOMBasedDrag(): UseDOMBasedDragReturn {
  const { mappingUserId } = useUnifiedAuth();
  const eventBus = useEventBus();
  const { getItem, moveItemOptimistic, isOperationPending, getPendingOperationType } = useMapCache();

  // Create service instance once and keep it stable
  const dragService = useMemo(() => {
    return new DOMBasedDragService(eventBus);
  }, [eventBus]);

  // Track internal state for React updates
  const [dragState, setDragState] = useState<DragState>(() => dragService.getState());

  // Configure the service with validation callbacks
  useEffect(() => {
    dragService.configure({
      validateDropTarget: (sourceId: string, targetId: string): { isValid: boolean; reason?: string } => {
        const sourceTile = getItem(sourceId);
        const targetTile = getItem(targetId);

        return validateDragOperation(
          sourceId,
          targetId,
          sourceTile,
          targetTile,
          mappingUserId
        );
      },
      determineOperation: (targetId: string): 'move' | 'swap' => {
        const targetTile = getItem(targetId);
        return targetTile ? 'swap' : 'move';
      }
    });
  }, [dragService, getItem, mappingUserId]);

  // Listen to drag service events to update React state
  useEffect(() => {
    const unsubscribeDragStarted = eventBus.on('drag.started', () => {
      setDragState(dragService.getState());
    });

    const unsubscribeDragHovering = eventBus.on('drag.hovering', () => {
      setDragState(dragService.getState());
    });

    const unsubscribeDragLeave = eventBus.on('drag.leave', () => {
      setDragState(dragService.getState());
    });

    const unsubscribeDragEnded = eventBus.on('drag.ended', () => {
      setDragState(dragService.getState());
    });

    const unsubscribeDragDropped = eventBus.on('drag.dropped', (event) => {
      // Handle the actual move operation
      const { sourceId, targetId } = event.payload as { sourceId: string; targetId: string; operation: 'move' | 'swap' };

      void (async () => {
        try {

          // Check for pending operations before starting the move
          if (isOperationPending(sourceId)) {
            const pendingType = getPendingOperationType(sourceId);
            throw new Error(`Cannot move tile: ${pendingType} operation in progress for source tile. Please wait for current operation to complete.`);
          }

          if (isOperationPending(targetId)) {
            const pendingType = getPendingOperationType(targetId);
            throw new Error(`Cannot move tile: ${pendingType} operation in progress for target tile. Please wait for current operation to complete.`);
          }

          await moveItemOptimistic(sourceId, targetId);
        } catch (error) {
          // Extract error message from various error types (tRPC, regular Error, etc.)
          const getErrorMessage = (err: unknown): string => {
            if (err instanceof Error) {
              return err.message;
            }
            if (typeof err === 'string') {
              return err;
            }
            if (err && typeof err === 'object' && err !== null) {
              // Handle tRPC errors and other structured errors safely
              const errObj = err as Record<string, unknown>;
              if (typeof errObj.message === 'string') {
                return errObj.message;
              }
              if (errObj.error && typeof errObj.error === 'object' && errObj.error !== null) {
                const errorObj = errObj.error as Record<string, unknown>;
                if (typeof errorObj.message === 'string') {
                  return errorObj.message;
                }
              }
              if (errObj.data && typeof errObj.data === 'object' && errObj.data !== null) {
                const dataObj = errObj.data as Record<string, unknown>;
                if (typeof dataObj.message === 'string') {
                  return dataObj.message;
                }
              }
            }
            return 'Failed to complete operation';
          };

          const errorMessage = getErrorMessage(error);

          eventBus.emit({
            type: 'error.occurred',
            source: 'map_cache',
            payload: {
              error: errorMessage,
              context: {
                operation: 'move',
                sourceCoordId: sourceId,
                targetCoordId: targetId,
                originalError: error // Include original error for debugging
              },
              retryable: true
            },
            timestamp: new Date(),
          });
        }
      })();

      setDragState(dragService.getState());
    });

    return () => {
      unsubscribeDragStarted();
      unsubscribeDragHovering();
      unsubscribeDragLeave();
      unsubscribeDragEnded();
      unsubscribeDragDropped();
    };
  }, [dragService, eventBus, moveItemOptimistic, isOperationPending, getPendingOperationType]);

  // Create drag props for draggable tiles
  const createDragProps = useCallback((coordId: string) => {
    const checkCanDrag = (): boolean => {
      const tile = getItem(coordId);

      // Use the validation utility that checks ownership and center tile
      if (!canDragTile(tile, mappingUserId)) {
        return false;
      }

      // Check if there's a pending operation on this tile
      if (isOperationPending(coordId)) {
        return false;
      }

      return true;
    };

    const isDraggable = checkCanDrag();

    return {
      draggable: isDraggable,
      onDragStart: (event: DragEvent<HTMLDivElement>) => {
        if (!isDraggable) {
          event.preventDefault();
          return;
        }

        const tileData = getItem(coordId);
        if (!tileData) {
          event.preventDefault();
          return;
        }

        dragService.startDrag(coordId, tileData, event);
      },
      onDragEnd: () => {
        dragService.endDrag();
      },
    };
  }, [dragService, getItem, mappingUserId, isOperationPending]);

  // Tile registration methods
  const registerTile = useCallback((coordId: string, element: HTMLElement) => {
    dragService.registerTile(coordId, element, true);
  }, [dragService]);

  const unregisterTile = useCallback((coordId: string) => {
    dragService.unregisterTile(coordId);
  }, [dragService]);

  // Global drop handler
  const onDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    dragService.executeDrop(event);
  }, [dragService]);

  // State query methods
  const isDraggingTile = useCallback((id: string): boolean => {
    return dragService.isDraggingTile(id);
  }, [dragService]);

  const isHoverTarget = useCallback((id: string): boolean => {
    return dragService.isHoverTarget(id);
  }, [dragService]);

  const getDropOperation = useCallback((id: string): 'move' | 'swap' | null => {
    return dragService.getDropOperation(id);
  }, [dragService]);

  return useMemo(() => ({
    createDragProps,
    registerTile,
    unregisterTile,
    onDrop,
    isDraggingTile,
    isHoverTarget,
    isDragging: dragState.isDragging,
    getDropOperation,
  }), [
    createDragProps,
    registerTile,
    unregisterTile,
    onDrop,
    isDraggingTile,
    isHoverTarget,
    dragState.isDragging,
    getDropOperation,
  ]);
}