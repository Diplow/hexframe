"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import type { DragEvent } from "react";
import { useUnifiedAuth } from "~/contexts/UnifiedAuthContext";
import { useMapCache } from '~/app/map/Cache';
import { useEventBus } from '~/app/map';
import { DOMBasedDragService, type DragState } from "~/app/map/Services/DragAndDrop/DOMBasedDragService";

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
  const { getItem, moveItemOptimistic } = useMapCache();

  // Create service instance once and keep it stable
  const dragService = useMemo(() => {
    return new DOMBasedDragService(eventBus);
  }, [eventBus]);

  // Track internal state for React updates
  const [dragState, setDragState] = useState<DragState>(() => dragService.getState());

  // Configure the service with validation callbacks
  useEffect(() => {
    dragService.configure({
      validateDropTarget: (_sourceId: string, _targetId: string): boolean => {
        // DOM service will handle validation internally based on business rules
        // For now, allow all drops - service will filter appropriately
        return true;
      },
      determineOperation: (_targetId: string): 'move' | 'swap' => {
        // For now, we'll always use 'move' - can be enhanced later
        return 'move';
      }
    });
  }, [dragService]);

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
          await moveItemOptimistic(sourceId, targetId);
        } catch (error) {
          eventBus.emit({
            type: 'error.occurred',
            source: 'map_cache',
            payload: {
              error: error instanceof Error ? error.message : 'Failed to complete operation',
              context: {
                operation: 'move',
                sourceCoordId: sourceId,
                targetCoordId: targetId
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
  }, [dragService, eventBus, moveItemOptimistic]);

  // Create drag props for draggable tiles
  const createDragProps = useCallback((coordId: string) => {
    const checkCanDrag = (): boolean => {
      const tile = getItem(coordId);
      // DOM service handles drag validation internally
      // Basic check: user must own the tile to drag it
      return tile ? tile.metadata.ownerId === mappingUserId?.toString() : false;
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
  }, [dragService, getItem, mappingUserId]);

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