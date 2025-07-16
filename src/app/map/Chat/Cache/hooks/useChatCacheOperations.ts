import useChatState from '../../_state/useChatState';
import { useEventBus } from '../../../Services/EventBus/event-bus-context';
import type { ChatEvent } from '../_events/event.types';
import type { TileData } from '../../../types/tile-data';

/**
 * Compatibility layer for components still using the old dispatch pattern
 * @deprecated Use useChatState directly and call domain operations
 */
export function useChatCacheOperations() {
  const chatState = useChatState();
  const eventBus = useEventBus();

  // Create a compatibility dispatch function
  const dispatch = (event: ChatEvent) => {
    console.warn('Direct dispatch is deprecated. Use domain operations from useChatState instead.');
    
    switch (event.type) {
      case 'user_message': {
        const payload = event.payload as { text: string };
        chatState.sendMessage(payload.text);
        break;
      }
      case 'system_message': {
        const payload = event.payload as { message: string; level?: 'info' | 'warning' | 'error' };
        chatState.showSystemMessage(payload.message, payload.level);
        break;
      }
      case 'operation_started': {
        const payload = event.payload as { operation: 'create' | 'update' | 'delete' | 'move' | 'swap'; tileId?: string; data?: unknown };
        chatState.startOperation(payload.operation, payload.tileId, payload.data);
        break;
      }
      case 'widget_closed': {
        const payload = event.payload as { widgetId: string };
        chatState.closeWidget(payload.widgetId);
        break;
      }
      case 'tile_selected': {
        const payload = event.payload as { tileData: TileData; openInEditMode?: boolean };
        if (payload.openInEditMode) {
          chatState.showEditWidget(payload.tileData);
        } else {
          chatState.showPreviewWidget(payload.tileData);
        }
        break;
      }
      case 'clear_chat':
        chatState.clearChat();
        break;
      case 'auth_required': {
        const payload = event.payload as { reason?: string };
        // Show auth required message
        chatState.showSystemMessage(payload.reason ?? 'Authentication required', 'warning');
        break;
      }
      default:
        console.error('Unhandled event type in compatibility layer:', event.type);
    }
  };

  return {
    messages: chatState.messages,
    widgets: chatState.widgets,
    events: chatState.events,
    dispatch,
    eventBus,
  };
}