import { useChatCache } from './ChatCacheProvider';

/**
 * Hook to access chat cache state and operations
 */
export function useChatCacheOperations() {
  const { state, dispatch, eventBus } = useChatCache();

  return {
    // State
    messages: state.visibleMessages,
    widgets: state.activeWidgets,
    
    // Operations
    sendMessage: (text: string) => {
      dispatch({
        id: `msg-${Date.now()}`,
        type: 'user_message',
        payload: { text },
        timestamp: new Date(),
        actor: 'user',
      });
    },

    selectTile: (tileId: string, tileData: { title: string; description?: string; content?: string; coordId: string }) => {
      dispatch({
        id: `select-${tileId}-${Date.now()}`,
        type: 'tile_selected',
        payload: { tileId, tileData },
        timestamp: new Date(),
        actor: 'system',
      });
    },

    startOperation: (operation: 'create' | 'update' | 'delete' | 'move' | 'swap', tileId?: string) => {
      dispatch({
        id: `op-start-${Date.now()}`,
        type: 'operation_started',
        payload: { operation, tileId },
        timestamp: new Date(),
        actor: 'system',
      });
    },

    completeOperation: (operation: 'create' | 'update' | 'delete' | 'move' | 'swap', message: string, tileId?: string) => {
      dispatch({
        id: `op-complete-${Date.now()}`,
        type: 'operation_completed',
        payload: {
          operation,
          tileId,
          result: 'success',
          message,
        },
        timestamp: new Date(),
        actor: 'system',
      });
    },

    showError: (error: string, context?: unknown) => {
      dispatch({
        id: `error-${Date.now()}`,
        type: 'error_occurred',
        payload: { error, context },
        timestamp: new Date(),
        actor: 'system',
      });
    },

    closeWidget: (widgetId: string) => {
      // In a real implementation, we might emit a widget_closed event
      // For now, widgets close themselves based on operation completion
      console.log('Widget close requested:', widgetId);
    },

    // Direct access to event bus for advanced use cases
    eventBus,
  };
}