import type { AppEvent } from '~/app/map/types';
import type { ChatEvent, WidgetResolvedPayload } from '~/app/map/Chat/_state/_events/event.types';
import {
  mapTileSelectedEventSchema,
  mapTileCreatedEventSchema,
  mapTileUpdatedEventSchema,
  mapTileDeletedEventSchema,
  mapChildrenDeletedEventSchema,
  mapTilesSwappedEventSchema,
  mapTileMovedEventSchema,
  mapItemCopiedEventSchema,
  mapOperationStartedEventSchema,
  mapNavigationEventSchema,
  authRequiredEventSchema,
  errorOccurredEventSchema,
  mapEditRequestedEventSchema,
  mapDeleteRequestedEventSchema,
  mapDeleteChildrenRequestedEventSchema,
  mapCreateRequestedEventSchema,
  mapFavoritesWidgetRequestedEventSchema,
  safeValidateEvent,
} from '~/app/map/types';

/**
 * Transform tile selection events to chat events
 */
function _transformTileSelectedEvent(validEvent: AppEvent, baseEvent: Partial<ChatEvent>): ChatEvent {
  const payload = mapTileSelectedEventSchema.parse(validEvent).payload;
  return {
    ...baseEvent,
    type: 'tile_selected',
    payload: {
      tileId: payload.tileId,
      tileData: {
        title: payload.tileData.title,
        description: payload.tileData.description,
        preview: undefined,
        content: payload.tileData.content,
        coordId: payload.tileData.coordId,
      },
      openInEditMode: payload.openInEditMode,
    },
  } as ChatEvent;
}

/**
 * Transform tile creation events to chat operation completed events
 */
function _transformTileCreatedEvent(validEvent: AppEvent, baseEvent: Partial<ChatEvent>): ChatEvent {
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

/**
 * Transform tile update events to chat operation completed events
 */
function _transformTileUpdatedEvent(validEvent: AppEvent, baseEvent: Partial<ChatEvent>): ChatEvent {
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

/**
 * Transform tile deletion events to chat operation completed events
 */
function _transformTileDeletedEvent(validEvent: AppEvent, baseEvent: Partial<ChatEvent>): ChatEvent {
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

/**
 * Transform children deleted events to chat operation completed events
 */
function _transformChildrenDeletedEvent(validEvent: AppEvent, baseEvent: Partial<ChatEvent>): ChatEvent {
  const payload = mapChildrenDeletedEventSchema.parse(validEvent).payload;
  const typeLabel = payload.directionType === 'structural' ? 'children' :
                    payload.directionType === 'composed' ? 'composed children' :
                    'hexPlan';
  return {
    ...baseEvent,
    type: 'operation_completed',
    payload: {
      operation: 'delete',
      result: 'success',
      tileId: payload.parentId,
      message: `Deleted ${payload.deletedCount} ${typeLabel} of "${payload.parentName}"`,
    },
  } as ChatEvent;
}

/**
 * Transform tile swap events to chat operation completed events
 */
function _transformTilesSwappedEvent(validEvent: AppEvent, baseEvent: Partial<ChatEvent>): ChatEvent {
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

/**
 * Transform tile move events to chat operation completed events
 */
function _transformTileMovedEvent(validEvent: AppEvent, baseEvent: Partial<ChatEvent>): ChatEvent {
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

/**
 * Transform item copy events to chat operation completed events
 */
function _transformItemCopiedEvent(validEvent: AppEvent, baseEvent: Partial<ChatEvent>): ChatEvent {
  const payload = mapItemCopiedEventSchema.parse(validEvent).payload;
  return {
    ...baseEvent,
    type: 'operation_completed',
    payload: {
      operation: 'copy',
      result: 'success',
      tileId: payload.destinationId,
      message: `Copied "${payload.sourceName}"`,
    },
  } as ChatEvent;
}

/**
 * Transform navigation events to chat navigation events
 */
function _transformNavigationEvent(validEvent: AppEvent, baseEvent: Partial<ChatEvent>): ChatEvent {
  const payload = mapNavigationEventSchema.parse(validEvent).payload;
  return {
    ...baseEvent,
    type: 'navigation',
    payload: {
      fromTileId: payload.fromCenterId,
      fromTileName: payload.fromCenterName,
      toTileId: payload.toCenterId,
      toTileName: payload.toCenterName,
    },
  } as ChatEvent;
}

/**
 * Transform operation started events to chat operation started events
 */
function _transformOperationStartedEvent(validEvent: AppEvent, baseEvent: Partial<ChatEvent>): ChatEvent {
  const payload = mapOperationStartedEventSchema.parse(validEvent).payload;
  return {
    ...baseEvent,
    type: 'operation_started',
    payload: {
      operation: payload.operation,
      tileId: payload.tileId,
      data: { tileName: payload.tileName },
    },
  } as ChatEvent;
}

/**
 * Transform map tile events to chat events using focused event transformers
 */
function _transformTileEvents(validEvent: AppEvent, baseEvent: Partial<ChatEvent>): ChatEvent | null {
  switch (validEvent.type) {
    case 'map.tile_selected':
      return _transformTileSelectedEvent(validEvent, baseEvent);

    case 'map.operation_started':
      return _transformOperationStartedEvent(validEvent, baseEvent);

    case 'map.tile_created':
      return _transformTileCreatedEvent(validEvent, baseEvent);

    case 'map.tile_updated':
      return _transformTileUpdatedEvent(validEvent, baseEvent);

    case 'map.tile_deleted':
      return _transformTileDeletedEvent(validEvent, baseEvent);

    case 'map.children_deleted':
      return _transformChildrenDeletedEvent(validEvent, baseEvent);

    case 'map.tiles_swapped':
      return _transformTilesSwappedEvent(validEvent, baseEvent);

    case 'map.tile_moved':
      return _transformTileMovedEvent(validEvent, baseEvent);

    case 'map.item_copied':
      return _transformItemCopiedEvent(validEvent, baseEvent);

    case 'map.navigation':
      return _transformNavigationEvent(validEvent, baseEvent);

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
      const payload: WidgetResolvedPayload = {
        widgetType: 'login',
        result: 'success',
        message: 'Login successful!',
      };
      return {
        ...baseEvent,
        type: 'widget_resolved',
        payload,
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
      const chatEvent = {
        ...baseEvent,
        type: 'error_occurred',
        payload: {
          message: payload.error,
          details: payload.context,
          severity: payload.retryable ? 'warning' : 'error',
        },
      } as ChatEvent;
      return chatEvent;
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
      // Create delete widget (not operation_started - that comes from MutationCoordinator)
      return {
        ...baseEvent,
        type: 'widget_created',
        payload: {
          widget: {
            id: `delete-${Date.now()}`,
            type: 'delete',
            data: {
              tileId: payload.tileId,
              tileName: payload.tileName,
            },
            priority: 'action',
            timestamp: baseEvent.timestamp,
          },
        },
      } as ChatEvent;
    }

    case 'map.delete_children_requested': {
      const payload = mapDeleteChildrenRequestedEventSchema.parse(validEvent).payload;
      // Create delete_children widget for bulk deletion confirmation
      return {
        ...baseEvent,
        type: 'widget_created',
        payload: {
          widget: {
            id: `delete-children-${Date.now()}`,
            type: 'delete_children',
            data: {
              tileId: payload.tileId,
              tileName: payload.tileName,
              directionType: payload.directionType,
            },
            priority: 'action',
            timestamp: baseEvent.timestamp,
          },
        },
      } as ChatEvent;
    }

    case 'map.create_requested': {
      const payload = mapCreateRequestedEventSchema.parse(validEvent).payload;
      // Create creation widget (not operation_started - that comes from MutationCoordinator)
      return {
        ...baseEvent,
        type: 'widget_created',
        payload: {
          widget: {
            id: `creation-${Date.now()}`,
            type: 'creation',
            data: {
              coordId: payload.coordId,
              parentName: payload.parentName,
              parentId: payload.parentId,
              parentCoordId: payload.parentCoordId,
            },
            priority: 'action',
            timestamp: baseEvent.timestamp,
          },
        },
      } as ChatEvent;
    }

    case 'map.favorites_widget_requested': {
      const payload = mapFavoritesWidgetRequestedEventSchema.parse(validEvent).payload;
      // Create favorites widget for managing tile shortcuts
      return {
        ...baseEvent,
        type: 'widget_created',
        payload: {
          widget: {
            id: `favorites-${Date.now()}`,
            type: 'favorites',
            data: {
              editShortcutForMapItemId: payload.editShortcutForMapItemId,
            },
            priority: 'action',
            timestamp: baseEvent.timestamp,
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
    console.error('[validateAndTransformMapEvent] ❌ VALIDATION FAILED for event type:', mapEvent.type);
    console.error('[validateAndTransformMapEvent] Event data:', mapEvent);
    console.error('[validateAndTransformMapEvent] Validation error:', validationResult.error);
    console.error('[validateAndTransformMapEvent] Error issues:', validationResult.error.issues);

    // Transform to error event to make validation failures visible
    return {
      id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: 'error_occurred',
      payload: {
        error: `Event validation failed for ${mapEvent.type}`,
        context: validationResult.error.issues,
        retryable: false,
      },
      timestamp: new Date(),
      actor: 'system',
    } as ChatEvent;
  }

  const validEvent = validationResult.data;
  const baseEvent = {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: validEvent.timestamp ?? new Date(),
    actor: 'system' as const,
  };

  // Try different transformer functions based on event type
  return _transformTileEvents(validEvent, baseEvent) ??
         _transformSystemEvents(validEvent, baseEvent) ??
         _transformOperationEvents(validEvent, baseEvent);
}

