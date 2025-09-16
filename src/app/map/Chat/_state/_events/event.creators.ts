import type { AppEvent } from '~/app/map/types';
import type { ChatEvent } from '~/app/map/Chat/_state/_events/event.types';
import {
  _transformTileSelectedEvent,
  _transformTileCreatedEvent,
  _transformTileUpdatedEvent,
  _transformTileDeletedEvent,
  _transformTilesSwappedEvent,
  _transformTileMovedEvent,
  _transformNavigationEvent,
} from '~/app/map/Chat/_state/_events/tile-event-transformers';
import {
  _transformAuthRequiredEvent,
  _transformAuthLogoutEvent,
  _transformErrorOccurredEvent,
} from '~/app/map/Chat/_state/_events/system-event-transformers';

// Re-export creators from domain modules
export {
  createUserMessageEvent,
  createSystemMessageEvent,
  createAssistantMessageEvent,
} from '~/app/map/Chat/_state/_events/message-creators';

export {
  createOperationStartedEvent,
} from '~/app/map/Chat/_state/_events/operation-creators';

/**
 * Create a chat event from a map event using domain-specific transformers
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