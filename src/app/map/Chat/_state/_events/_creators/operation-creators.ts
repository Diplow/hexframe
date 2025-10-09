import type { ChatEvent } from '~/app/map/Chat/_state/_events/event.types';

/**
 * Create an operation started event
 */
export function createOperationStartedEvent(
  operation: 'create' | 'update' | 'delete' | 'move' | 'swap',
  tileId?: string,
  data?: unknown
): ChatEvent {
  return {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: 'operation_started',
    payload: { operation, tileId, data },
    timestamp: new Date(),
    actor: 'system',
  };
}