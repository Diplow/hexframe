import type { AppEvent } from '~/app/map/types';
import type { ChatEvent } from '~/app/map/Chat/_state/_events/event.types';
import { 
  mapTileSelectedEventSchema,
  mapTileCreatedEventSchema,
  mapTileUpdatedEventSchema,
  mapTileDeletedEventSchema,
  mapTilesSwappedEventSchema,
  mapTileMovedEventSchema,
  mapNavigationEventSchema,
  authRequiredEventSchema,
  errorOccurredEventSchema,
  mapEditRequestedEventSchema,
  mapDeleteRequestedEventSchema,
  mapCreateRequestedEventSchema,
  safeValidateEvent,
} from '~/app/map/types';

/**
 * Validates and transforms a map event into a chat event
 * Returns null if the event is invalid or not relevant to chat
 */
export function validateAndTransformMapEvent(mapEvent: AppEvent): ChatEvent | null {
  const validationResult = safeValidateEvent(mapEvent);
  
  if (!validationResult.success) {
    return null;
  }

  const validEvent = validationResult.data;
  const baseEvent = {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: validEvent.timestamp ?? new Date(),
    actor: 'system' as const,
  };

  // Type-safe event handling with validated payloads
  switch (validEvent.type) {
    case 'map.tile_selected': {
      const payload = mapTileSelectedEventSchema.parse(validEvent).payload;
      return {
        ...baseEvent,
        type: 'tile_selected',
        payload: {
          tileId: payload.tileId,
          tileData: {
            title: payload.tileData.title,
            description: payload.tileData.description,
            content: payload.tileData.content,
            coordId: payload.tileData.coordId,
          },
          openInEditMode: payload.openInEditMode,
        },
      };
    }

    case 'map.tile_created': {
      const payload = mapTileCreatedEventSchema.parse(validEvent).payload;
      return {
        ...baseEvent,
        type: 'operation_completed',
        payload: {
          operation: 'create',
          tileId: payload.tileId,
          result: 'success',
          message: `Created "${payload.tileName}"`,
        },
      };
    }

    case 'map.tile_updated': {
      const payload = mapTileUpdatedEventSchema.parse(validEvent).payload;
      return {
        ...baseEvent,
        type: 'operation_completed',
        payload: {
          operation: 'update',
          tileId: payload.tileId,
          result: 'success',
          message: `Updated "${payload.tileName}"`,
        },
      };
    }

    case 'map.tile_deleted': {
      const payload = mapTileDeletedEventSchema.parse(validEvent).payload;
      return {
        ...baseEvent,
        type: 'operation_completed',
        payload: {
          operation: 'delete',
          tileId: payload.tileId,
          result: 'success',
          message: `Deleted "${payload.tileName}"`,
        },
      };
    }

    case 'map.tiles_swapped': {
      const payload = mapTilesSwappedEventSchema.parse(validEvent).payload;
      return {
        ...baseEvent,
        type: 'operation_completed',
        payload: {
          operation: 'swap',
          result: 'success',
          message: `Swapped "${payload.tile1Name}" with "${payload.tile2Name}"`,
        },
      };
    }

    case 'map.tile_moved': {
      const payload = mapTileMovedEventSchema.parse(validEvent).payload;
      return {
        ...baseEvent,
        type: 'operation_completed',
        payload: {
          operation: 'move',
          tileId: payload.tileId,
          result: 'success',
          message: `Moved "${payload.tileName}"`,
        },
      };
    }

    case 'map.navigation': {
      const payload = mapNavigationEventSchema.parse(validEvent).payload;
      return {
        ...baseEvent,
        type: 'navigation',
        payload: {
          fromTileId: payload.fromCenterId,
          toTileId: payload.toCenterId,
          toTileName: payload.toCenterName,
        },
      };
    }

    case 'auth.required': {
      const payload = authRequiredEventSchema.parse(validEvent).payload;
      return {
        ...baseEvent,
        type: 'auth_required' as const,
        payload: {
          reason: payload.reason,
          requiredFor: payload.requiredFor,
        },
      };
    }

    case 'auth.login': {
      // When user logs in successfully, resolve the login widget
      return {
        ...baseEvent,
        type: 'widget_resolved',
        payload: {
          widgetType: 'login',
          result: 'success',
          message: 'Login successful!',
        },
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
      const payload = errorOccurredEventSchema.parse(validEvent).payload;
      return {
        ...baseEvent,
        type: 'error_occurred',
        payload: {
          error: payload.error,
          context: payload.context,
          retryable: payload.retryable,
        },
      };
    }

    // Request events from Canvas
    case 'map.edit_requested': {
      const payload = mapEditRequestedEventSchema.parse(validEvent).payload;
      return {
        ...baseEvent,
        type: 'tile_selected',
        actor: 'user' as const, // User initiated from Canvas
        payload: {
          tileId: payload.tileId,
          tileData: {
            title: payload.tileData.title,
            description: payload.tileData.content,
            content: payload.tileData.content,
            coordId: payload.tileData.coordId,
          },
          openInEditMode: true, // Always open in edit mode for edit requests
        },
      };
    }

    case 'map.delete_requested': {
      const payload = mapDeleteRequestedEventSchema.parse(validEvent).payload;
      return {
        ...baseEvent,
        type: 'operation_started' as const,
        actor: 'user' as const, // User initiated from Canvas or Chat
        payload: {
          operation: 'delete' as const,
          tileId: payload.tileId,
          data: {
            tileId: payload.tileId, // Also include tileId in data
            tileName: payload.tileName,
          },
        },
      };
    }

    case 'map.create_requested': {
      const payload = mapCreateRequestedEventSchema.parse(validEvent).payload;
      return {
        ...baseEvent,
        type: 'operation_started',
        actor: 'user' as const, // User initiated from Canvas
        payload: {
          operation: 'create',
          tileId: payload.parentCoordId,
          data: {
            coordId: payload.coordId,
            parentName: payload.parentName,
            parentId: payload.parentId,
            parentCoordId: payload.parentCoordId,
          },
        },
      };
    }

    default:
      // Event types not relevant to chat
      return null;
  }
}