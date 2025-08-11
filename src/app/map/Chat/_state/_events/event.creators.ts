import type { AppEvent } from '../../../types/events';
import type { ChatEvent, TileSelectedPayload, OperationCompletedPayload, NavigationPayload, AuthRequiredPayload, ErrorOccurredPayload } from './event.types';

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
    case 'map.tile_selected': {
      const payload = mapEvent.payload as { tileId: string; tileData: { title: string; description?: string; content?: string; coordId: string }; openInEditMode?: boolean };
      return {
        ...baseEvent,
        type: 'tile_selected',
        payload: {
          tileId: payload.tileId,
          tileData: payload.tileData,
          openInEditMode: payload.openInEditMode,
        } as TileSelectedPayload,
      };
    }

    case 'map.tile_created': {
      const payload = mapEvent.payload as { tileId: string; tileName: string };
      return {
        ...baseEvent,
        type: 'operation_completed',
        payload: {
          operation: 'create',
          tileId: payload.tileId,
          result: 'success',
          message: `Created "${payload.tileName}"`,
        } as OperationCompletedPayload,
      };
    }

    case 'map.tile_updated': {
      const payload = mapEvent.payload as { tileId: string; tileName: string };
      return {
        ...baseEvent,
        type: 'operation_completed',
        payload: {
          operation: 'update',
          tileId: payload.tileId,
          result: 'success',
          message: `Updated "${payload.tileName}"`,
        } as OperationCompletedPayload,
      };
    }

    case 'map.tile_deleted': {
      const payload = mapEvent.payload as { tileId: string; tileName: string };
      return {
        ...baseEvent,
        type: 'operation_completed',
        payload: {
          operation: 'delete',
          tileId: payload.tileId,
          result: 'success',
          message: `Deleted "${payload.tileName}"`,
        } as OperationCompletedPayload,
      };
    }

    case 'map.tiles_swapped': {
      const payload = mapEvent.payload as { tile1Name: string; tile2Name: string };
      return {
        ...baseEvent,
        type: 'operation_completed',
        payload: {
          operation: 'swap',
          result: 'success',
          message: `Swapped "${payload.tile1Name}" with "${payload.tile2Name}"`,
        } as OperationCompletedPayload,
      };
    }

    case 'map.tile_moved': {
      const payload = mapEvent.payload as { tileId: string; tileName: string };
      return {
        ...baseEvent,
        type: 'operation_completed',
        payload: {
          operation: 'move',
          tileId: payload.tileId,
          result: 'success',
          message: `Moved "${payload.tileName}"`,
        } as OperationCompletedPayload,
      };
    }

    case 'map.navigation': {
      const payload = mapEvent.payload as { fromCenterId?: string; toCenterId: string; toCenterName: string };
      return {
        ...baseEvent,
        type: 'navigation',
        payload: {
          fromTileId: payload.fromCenterId,
          toTileId: payload.toCenterId,
          toTileName: payload.toCenterName,
        } as NavigationPayload,
      };
    }

    case 'auth.required': {
      const payload = mapEvent.payload as { reason: string };
      return {
        ...baseEvent,
        type: 'auth_required',
        payload: {
          reason: payload.reason,
        } as AuthRequiredPayload,
      };
    }

    case 'auth.logout': {
      return {
        ...baseEvent,
        type: 'clear_chat',
        payload: {},
      };
    }

    case 'error.occurred': {
      const payload = mapEvent.payload as { error: string; context?: unknown };
      return {
        ...baseEvent,
        type: 'error_occurred',
        payload: {
          error: payload.error,
          context: payload.context,
        } as ErrorOccurredPayload,
      };
    }

    default:
      // Don't create chat events for unrecognized map events
      return null;
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