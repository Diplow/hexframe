import type { ChatEvent, TileSelectedPayload, OperationCompletedPayload, NavigationPayload } from '~/app/map/Chat/_state/_events/event.types';

/**
 * Transform tile selection events to chat events
 */
export function _transformTileSelectedEvent(baseEvent: Omit<ChatEvent, 'type' | 'payload'>, payload: unknown): ChatEvent {
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

/**
 * Transform tile creation events to chat operation completed events
 */
export function _transformTileCreatedEvent(baseEvent: Omit<ChatEvent, 'type' | 'payload'>, payload: unknown): ChatEvent {
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

/**
 * Transform tile update events to chat operation completed events
 */
export function _transformTileUpdatedEvent(baseEvent: Omit<ChatEvent, 'type' | 'payload'>, payload: unknown): ChatEvent {
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

/**
 * Transform tile deletion events to chat operation completed events
 */
export function _transformTileDeletedEvent(baseEvent: Omit<ChatEvent, 'type' | 'payload'>, payload: unknown): ChatEvent {
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

/**
 * Transform tile swap events to chat operation completed events  
 */
export function _transformTilesSwappedEvent(baseEvent: Omit<ChatEvent, 'type' | 'payload'>, payload: unknown): ChatEvent {
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

/**
 * Transform tile move events to chat operation completed events
 */
export function _transformTileMovedEvent(baseEvent: Omit<ChatEvent, 'type' | 'payload'>, payload: unknown): ChatEvent {
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

/**
 * Transform navigation events to chat navigation events
 */
export function _transformNavigationEvent(baseEvent: Omit<ChatEvent, 'type' | 'payload'>, payload: unknown): ChatEvent {
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