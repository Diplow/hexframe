import type { ChatEvent } from '~/app/map/Chat/_state/_events/event.types';

/**
 * Create a user message event
 */
export function createUserMessageEvent(text: string): ChatEvent {
  return {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: 'user_message',
    payload: { text },
    timestamp: new Date(),
    actor: 'user',
  };
}

/**
 * Create a system message event
 */
export function createSystemMessageEvent(message: string, level: 'info' | 'warning' | 'error' = 'info'): ChatEvent {
  return {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: 'system_message',
    payload: { message, level },
    timestamp: new Date(),
    actor: 'system',
  };
}

/**
 * Create an assistant message event
 */
export function createAssistantMessageEvent(text: string): ChatEvent {
  return {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: 'message',
    payload: { text },
    timestamp: new Date(),
    actor: 'assistant',
  };
}