import type { AppEvent } from '~/app/map/types';
import type { ChatEvent, TileSelectedPayload, OperationCompletedPayload, NavigationPayload, AuthRequiredPayload, ErrorOccurredPayload } from '~/app/map/Chat/_state/_events/event.types';

/**
 * Create a chat event from a map event
 */
export function createChatEventFromMapEvent(mapEvent: AppEvent): ChatEvent | null {
  // Event creation logging removed to prevent circular dependencies

  const baseEvent = {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: mapEvent.timestamp ?? new Date(),
    actor: 'system' as const,
  };

  switch (mapEvent.type) {
    case 'map.tile_selected':
      return _transformTileSelectedEvent(baseEvent, mapEvent.payload)
    case 'map.tile_created':
      return _transformTileCreatedEvent(baseEvent, mapEvent.payload)
    case 'map.tile_updated':
      return _transformTileUpdatedEvent(baseEvent, mapEvent.payload)
    case 'map.tile_deleted':
      return _transformTileDeletedEvent(baseEvent, mapEvent.payload)
    case 'map.tiles_swapped':
      return _transformTilesSwappedEvent(baseEvent, mapEvent.payload)
    case 'map.tile_moved':
      return _transformTileMovedEvent(baseEvent, mapEvent.payload)
    case 'map.navigation':
      return _transformNavigationEvent(baseEvent, mapEvent.payload)
    case 'auth.required':
      return _transformAuthRequiredEvent(baseEvent, mapEvent.payload)
    case 'auth.logout':
      return _transformAuthLogoutEvent(baseEvent)
    case 'error.occurred':
      return _transformErrorOccurredEvent(baseEvent, mapEvent.payload)
    default:
      return null
  }
}

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

// Event transformer helper functions
function _transformTileSelectedEvent(baseEvent: Omit<ChatEvent, 'type' | 'payload'>, payload: unknown): ChatEvent {
  const typedPayload = payload as { tileId: string; tileData: { title: string; description?: string; content?: string; coordId: string }; openInEditMode?: boolean }
  return {
    ...baseEvent,
    type: 'tile_selected' as const,
    payload: {
      tileId: typedPayload.tileId,
      tileData: typedPayload.tileData,
      openInEditMode: typedPayload.openInEditMode,
    } as TileSelectedPayload,
  }
}

function _transformTileCreatedEvent(baseEvent: Omit<ChatEvent, 'type' | 'payload'>, payload: unknown): ChatEvent {
  const typedPayload = payload as { tileId: string; tileName: string }
  return {
    ...baseEvent,
    type: 'operation_completed' as const,
    payload: {
      operation: 'create',
      tileId: typedPayload.tileId,
      result: 'success',
      message: `Created "${typedPayload.tileName}"`,
    } as OperationCompletedPayload,
  }
}

function _transformTileUpdatedEvent(baseEvent: Omit<ChatEvent, 'type' | 'payload'>, payload: unknown): ChatEvent {
  const typedPayload = payload as { tileId: string; tileName: string }
  return {
    ...baseEvent,
    type: 'operation_completed' as const,
    payload: {
      operation: 'update',
      tileId: typedPayload.tileId,
      result: 'success',
      message: `Updated "${typedPayload.tileName}"`,
    } as OperationCompletedPayload,
  }
}

function _transformTileDeletedEvent(baseEvent: Omit<ChatEvent, 'type' | 'payload'>, payload: unknown): ChatEvent {
  const typedPayload = payload as { tileId: string; tileName: string }
  return {
    ...baseEvent,
    type: 'operation_completed' as const,
    payload: {
      operation: 'delete',
      tileId: typedPayload.tileId,
      result: 'success',
      message: `Deleted "${typedPayload.tileName}"`,
    } as OperationCompletedPayload,
  }
}

function _transformTilesSwappedEvent(baseEvent: Omit<ChatEvent, 'type' | 'payload'>, payload: unknown): ChatEvent {
  const typedPayload = payload as { tile1Name: string; tile2Name: string }
  return {
    ...baseEvent,
    type: 'operation_completed' as const,
    payload: {
      operation: 'swap',
      result: 'success',
      message: `Swapped "${typedPayload.tile1Name}" with "${typedPayload.tile2Name}"`,
    } as OperationCompletedPayload,
  }
}

function _transformTileMovedEvent(baseEvent: Omit<ChatEvent, 'type' | 'payload'>, payload: unknown): ChatEvent {
  const typedPayload = payload as { tileId: string; tileName: string }
  return {
    ...baseEvent,
    type: 'operation_completed' as const,
    payload: {
      operation: 'move',
      tileId: typedPayload.tileId,
      result: 'success',
      message: `Moved "${typedPayload.tileName}"`,
    } as OperationCompletedPayload,
  }
}

function _transformNavigationEvent(baseEvent: Omit<ChatEvent, 'type' | 'payload'>, payload: unknown): ChatEvent {
  const typedPayload = payload as { fromCenterId?: string; toCenterId: string; toCenterName: string }
  return {
    ...baseEvent,
    type: 'navigation' as const,
    payload: {
      fromTileId: typedPayload.fromCenterId,
      toTileId: typedPayload.toCenterId,
      toTileName: typedPayload.toCenterName,
    } as NavigationPayload,
  }
}

function _transformAuthRequiredEvent(baseEvent: Omit<ChatEvent, 'type' | 'payload'>, payload: unknown): ChatEvent {
  const typedPayload = payload as { reason: string }
  return {
    ...baseEvent,
    type: 'auth_required' as const,
    payload: {
      reason: typedPayload.reason,
    } as AuthRequiredPayload,
  }
}

function _transformAuthLogoutEvent(baseEvent: Omit<ChatEvent, 'type' | 'payload'>): ChatEvent {
  return {
    ...baseEvent,
    type: 'clear_chat' as const,
    payload: {},
  }
}

function _transformErrorOccurredEvent(baseEvent: Omit<ChatEvent, 'type' | 'payload'>, payload: unknown): ChatEvent {
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