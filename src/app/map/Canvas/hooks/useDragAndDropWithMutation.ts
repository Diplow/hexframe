import { useUnifiedAuth } from "~/contexts/UnifiedAuthContext";
import { useMapCache } from "../../Cache/_hooks/use-map-cache";
import { useDragAndDrop } from "./useDragAndDrop";
import { CoordSystem } from "~/lib/domains/mapping/utils/hex-coordinates";
import type { UseDragAndDropReturn } from "./types";
import { useEventBus } from "../../Services/EventBus/event-bus-context";

/**
 * Hook that combines drag and drop functionality with tRPC mutation
 * This wraps the useDragAndDrop hook and provides the mutation integration
 */
export function useDragAndDropWithMutation(): Omit<UseDragAndDropReturn, 'dragState'> {
  const { mappingUserId } = useUnifiedAuth();
  const eventBus = useEventBus();
  const { items, moveItemOptimistic } = useMapCache();
  
  // Note: getDirection and getParentInfo helpers removed as they were unused
  
  // Create move handler that uses mapCache
  // Chat messages are handled by the mutation coordinator via event bus
  const handleMove = async (sourceCoordId: string, targetCoordId: string) => {
    const sourceItem = items[sourceCoordId];
    const targetItem = items[targetCoordId];
    
    if (!sourceItem) return;
    
    try {
      // Use the new moveItemOptimistic from mapCache
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
  };
  
  // Initialize drag and drop with the simplified mutation
  const {
    dragHandlers,
    canDragTile,
    isDraggingTile,
    isDropTarget,
    isValidDropTarget,
    isDragging,
    getDropOperation,
  } = useDragAndDrop({
    cacheState: { 
      itemsById: items,
      regionMetadata: {},
      currentCenter: null,
      expandedItemIds: [],
      isLoading: false,
      error: null,
      lastUpdated: Date.now(),
      cacheConfig: {
        maxAge: 300000,
        backgroundRefreshInterval: 60000,
        enableOptimisticUpdates: true,
        maxDepth: 3
      }
    },
    currentUserId: mappingUserId ?? null,
    moveMapItemMutation: {
      mutateAsync: async ({ oldCoords, newCoords }) => {
        const sourceCoordId = CoordSystem.createId(oldCoords);
        const targetCoordId = CoordSystem.createId(newCoords);
        
        await handleMove(sourceCoordId, targetCoordId);
        
        // Return mock result since the real work is done by moveItemOptimistic
        return {
          movedItemId: sourceCoordId,
          modifiedItems: [],
          affectedCount: 0
        };
      }
    },
    onMoveComplete: () => {
      // Move completed successfully - chat message already dispatched
    },
    onMoveError: (error) => {
      console.error('Failed to move tile:', error);
      // TODO: Show error toast or notification
    },
    updateCache: () => {
      // No-op since mapCache handles all updates internally
    },
  });
  
  return {
    dragHandlers,
    canDragTile,
    isDraggingTile,
    isDropTarget,
    isValidDropTarget,
    isDragging,
    getDropOperation,
  };
}