import type { ChatEvent, AuthRequiredPayload, ErrorOccurredPayload } from '~/app/map/Chat/_state/_events/event.types';

/**
 * Transform auth required events to chat auth required events
 */
export function _transformAuthRequiredEvent(baseEvent: Omit<ChatEvent, 'type' | 'payload'>, payload: unknown): ChatEvent {
  const typedPayload = payload as { reason: string }
  return {
    ...baseEvent,
    type: 'auth_required' as const,
    payload: {
      reason: typedPayload.reason,
    } as AuthRequiredPayload,
  }
}

/**
 * Transform auth logout events to clear chat events
 */
export function _transformAuthLogoutEvent(baseEvent: Omit<ChatEvent, 'type' | 'payload'>): ChatEvent {
  return {
    ...baseEvent,
    type: 'clear_chat' as const,
    payload: {},
  }
}

/**
 * Transform error occurred events to chat error events
 */
export function _transformErrorOccurredEvent(baseEvent: Omit<ChatEvent, 'type' | 'payload'>, payload: unknown): ChatEvent {
  const typedPayload = payload as { error: string; context?: unknown }
  return {
    ...baseEvent,
    type: 'error_occurred' as const,
    payload: {
      error: typedPayload.error,
      context: typedPayload.context,
    } as ErrorOccurredPayload,
  }
}