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
 * Transform map tile events to chat events
 */
function _transformTileEvents(validEvent: AppEvent, baseEvent: Partial<ChatEvent>): ChatEvent | null {
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
      } as ChatEvent;
    }

    case 'map.tile_created': {
      const payload = mapTileCreatedEventSchema.parse(validEvent).payload;
      return {
        ...baseEvent,
        type: 'operation_completed',
        payload: {
          operation: 'create',
          result: 'success',
          tileId: payload.tileId,
          message: `Created tile "${payload.tileName}"`,
        },
      } as ChatEvent;
    }

    case 'map.tile_updated': {
      const payload = mapTileUpdatedEventSchema.parse(validEvent).payload;
      return {
        ...baseEvent,
        type: 'operation_completed',
        payload: {
          operation: 'update',
          result: 'success',
          tileId: payload.tileId,
          message: `Updated tile "${payload.tileName}"`,
        },
      } as ChatEvent;
    }

    case 'map.tile_deleted': {
      const payload = mapTileDeletedEventSchema.parse(validEvent).payload;
      return {
        ...baseEvent,
        type: 'operation_completed',
        payload: {
          operation: 'delete',
          result: 'success',
          tileId: payload.tileId,
          message: `Deleted tile "${payload.tileName}"`,
        },
      } as ChatEvent;
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
      } as ChatEvent;
    }

    case 'map.tile_moved': {
      const payload = mapTileMovedEventSchema.parse(validEvent).payload;
      return {
        ...baseEvent,
        type: 'operation_completed',
        payload: {
          operation: 'move',
          result: 'success',
          tileId: payload.tileId,
          message: `Moved "${payload.tileName}"`,
        },
      } as ChatEvent;
    }

    case 'map.navigation': {
      const payload = mapNavigationEventSchema.parse(validEvent).payload;
      return {
        ...baseEvent,
        type: 'navigation',
        payload: {
          toTileId: payload.toCenterId,
          toTileName: payload.toCenterName,
          fromTileName: payload.fromCenterId,
        },
      } as ChatEvent;
    }

    default:
      return null;
  }
}

/**
 * Transform auth and error events to chat events
 */
function _transformSystemEvents(validEvent: AppEvent, baseEvent: Partial<ChatEvent>): ChatEvent | null {
  switch (validEvent.type) {
    case 'auth.required': {
      const payload = authRequiredEventSchema.parse(validEvent).payload;
      return {
        ...baseEvent,
        type: 'auth_required',
        payload: {
          message: payload.reason,
          action: payload.requiredFor,
        },
      } as ChatEvent;
    }

    case 'auth.login': {
      return {
        ...baseEvent,
        type: 'widget_resolved',
        payload: {
          widgetType: 'login',
          result: 'success',
          message: 'Login successful!',
        },
      } as ChatEvent;
    }

    case 'auth.logout': {
      return {
        ...baseEvent,
        type: 'system_message',
        payload: {
          message: 'Logged out successfully',
          level: 'info',
        },
      } as ChatEvent;
    }

    case 'error.occurred': {
      const payload = errorOccurredEventSchema.parse(validEvent).payload;
      return {
        ...baseEvent,
        type: 'error_occurred',
        payload: {
          message: payload.error,
          details: payload.context,
          severity: payload.retryable ? 'warning' : 'error',
        },
      } as ChatEvent;
    }

    default:
      return null;
  }
}

/**
 * Transform operation request events to chat events
 */
function _transformOperationEvents(validEvent: AppEvent, baseEvent: Partial<ChatEvent>): ChatEvent | null {
  switch (validEvent.type) {
    case 'map.edit_requested': {
      const payload = mapEditRequestedEventSchema.parse(validEvent).payload;
      return {
        ...baseEvent,
        type: 'tile_selected',
        payload: {
          tileId: payload.tileId,
          tileData: payload.tileData,
          openInEditMode: true,
        },
      } as ChatEvent;
    }

    case 'map.delete_requested': {
      const payload = mapDeleteRequestedEventSchema.parse(validEvent).payload;
      return {
        ...baseEvent,
        type: 'operation_started',
        payload: {
          operation: 'delete',
          tileId: payload.tileId,
          data: { tileName: payload.tileName },
        },
      } as ChatEvent;
    }

    case 'map.create_requested': {
      const payload = mapCreateRequestedEventSchema.parse(validEvent).payload;
      return {
        ...baseEvent,
        type: 'operation_started',
        payload: {
          operation: 'create',
          data: {
            coordId: payload.coordId,
            parentName: payload.parentName,
            parentId: payload.parentId,
            parentCoordId: payload.parentCoordId,
          },
        },
      } as ChatEvent;
    }

    default:
      return null;
  }
}

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

  // Try different transformer functions based on event type
  return _transformTileEvents(validEvent, baseEvent) ||
         _transformSystemEvents(validEvent, baseEvent) ||
         _transformOperationEvents(validEvent, baseEvent);
}

