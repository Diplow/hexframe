import { useAuth } from "~/contexts/AuthContext";
import { useMapCache } from "../../Cache/_hooks/use-map-cache";
import { useDragAndDrop } from "./useDragAndDrop";
import { useChatCacheOperations } from "../../Chat/_cache/hooks/useChatCacheOperations";
import { CoordSystem } from "~/lib/domains/mapping/utils/hex-coordinates";
import type { UseDragAndDropReturn } from "./types";
import type { ChatEvent } from "../../Chat/_cache/types";

/**
 * Hook that combines drag and drop functionality with tRPC mutation
 * This wraps the useDragAndDrop hook and provides the mutation integration
 */
export function useDragAndDropWithMutation(): Omit<UseDragAndDropReturn, 'dragState'> {
  const { mappingUserId } = useAuth();
  const { dispatch: chatDispatch } = useChatCacheOperations();
  const { items, moveItemOptimistic } = useMapCache();
  
  // Get helper function to calculate direction
  const getDirection = (coordId: string) => {
    const coords = CoordSystem.parseId(coordId);
    const lastIndex = coords.path[coords.path.length - 1];
    
    if (lastIndex === undefined) return undefined;
    
    const directions: Record<number, string> = {
      1: 'north west',
      2: 'north east',
      3: 'east',
      4: 'south east',
      5: 'south west',
      6: 'west',
    };
    
    return directions[lastIndex];
  };
  
  // Get parent info from coordId
  const getParentInfo = (coordId: string) => {
    const coords = CoordSystem.parseId(coordId);
    const parentCoords = CoordSystem.getParentCoord(coords);
    if (!parentCoords) return undefined;
    
    const parentCoordId = CoordSystem.createId(parentCoords);
    const parentItem = items[parentCoordId];
    return parentItem ? { name: parentItem.data.name, coordId: parentCoordId } : undefined;
  };
  
  // Create move handler that uses mapCache and dispatches chat messages
  const handleMove = async (sourceCoordId: string, targetCoordId: string) => {
    const sourceItem = items[sourceCoordId];
    const targetItem = items[targetCoordId];
    
    if (!sourceItem) return;
    
    // Show loading widget
    const startEvent: ChatEvent = {
      type: 'operation_started',
      payload: {
        operation: targetItem ? 'swap' : 'move',
        tileId: sourceCoordId,
        data: {
          sourceName: sourceItem.data.name,
          targetName: targetItem?.data.name
        }
      },
      id: `op-start-${Date.now()}`,
      timestamp: new Date(),
      actor: 'system'
    };
    chatDispatch(startEvent);
    
    try {
      // Use the new moveItemOptimistic from mapCache
      const result = await moveItemOptimistic(sourceCoordId, targetCoordId);
      
      // Dispatch appropriate chat message
      if (result.isSwap && targetItem) {
        // It's a swap operation
        const swapEvent: ChatEvent = {
          type: 'operation_completed',
          payload: {
            operation: 'swap',
            result: 'success',
            message: `Swapped ${sourceItem.data.name} with ${targetItem.data.name}`
          },
          id: `op-complete-${Date.now()}`,
          timestamp: new Date(),
          actor: 'system'
        };
        chatDispatch(swapEvent);
      } else {
        // It's a move operation
        const direction = getDirection(targetCoordId);
        const parentInfo = getParentInfo(targetCoordId);
        
        const moveEvent: ChatEvent = {
          type: 'operation_completed',
          payload: {
            operation: 'move',
            result: 'success',
            message: `Moved ${sourceItem.data.name}${direction ? ` to ${direction}` : ''}${parentInfo ? ` of ${parentInfo.name}` : ''}`
          },
          id: `op-complete-${Date.now()}`,
          timestamp: new Date(),
          actor: 'system'
        };
        chatDispatch(moveEvent);
      }
    } catch (error) {
      console.error('Failed to move/swap tiles:', error);
      
      // Show error widget
      const errorEvent: ChatEvent = {
        type: 'error_occurred',
        payload: {
          error: error instanceof Error ? error.message : 'Failed to complete operation',
          context: {
            operation: targetItem ? 'swap' : 'move',
            sourceItem: sourceItem.data.name,
            targetItem: targetItem?.data.name
          },
          retryable: true
        },
        id: `error-${Date.now()}`,
        timestamp: new Date(),
        actor: 'system'
      };
      chatDispatch(errorEvent);
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