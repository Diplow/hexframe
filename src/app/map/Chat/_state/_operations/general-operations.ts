import type { ChatEvent } from '~/app/map/Chat/_state/_events/event.types';
import { createOperationStartedEvent } from '~/app/map/Chat/_state/_events/event.creators';

/**
 * General operations
 */
export function createGeneralOperations(dispatch: (event: ChatEvent) => void) {
  return {
    startOperation(operation: 'create' | 'update' | 'delete' | 'move' | 'swap', tileId?: string, data?: unknown) {
      dispatch(createOperationStartedEvent(operation, tileId, data));
    },
    clearChat() {
      dispatch({
        type: 'clear_chat',
        payload: {},
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date(),
        actor: 'system',
      });
    },
  };
}