import type { ChatEvent, TileSelectedPayload, OperationCompletedPayload, OperationStartedPayload, NavigationPayload } from '~/app/map/Chat/_state/_events/event.types';

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
 * Transform operation started events to chat operation started events
 */
export function _transformOperationStartedEvent(baseEvent: Omit<ChatEvent, 'type' | 'payload'>, payload: unknown): ChatEvent {
  const typedPayload = payload as { operation: 'create' | 'update' | 'delete' | 'move' | 'swap' | 'copy'; tileId?: string; tileName?: string }
  return {
    ...baseEvent,
    type: 'operation_started' as const,
    payload: {
      operation: typedPayload.operation,
      tileId: typedPayload.tileId,
      data: { tileName: typedPayload.tileName },
    } as OperationStartedPayload,
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
 * Transform item copy events to chat operation completed events
 */
export function _transformItemCopiedEvent(baseEvent: Omit<ChatEvent, 'type' | 'payload'>, payload: unknown): ChatEvent {
  const typedPayload = payload as { destinationId: string; sourceName: string }
  return {
    ...baseEvent,
    type: 'operation_completed' as const,
    payload: {
      operation: 'copy',
      tileId: typedPayload.destinationId,
      result: 'success',
      message: `Copied "${typedPayload.sourceName}"`,
    } as OperationCompletedPayload,
  }
}

/**
 * Transform navigation events to chat navigation events
 */
export function _transformNavigationEvent(baseEvent: Omit<ChatEvent, 'type' | 'payload'>, payload: unknown): ChatEvent {
  const typedPayload = payload as { fromCenterId?: string; fromCenterName?: string; toCenterId: string; toCenterName: string }
  return {
    ...baseEvent,
    type: 'navigation' as const,
    payload: {
      fromTileId: typedPayload.fromCenterId,
      fromTileName: typedPayload.fromCenterName,
      toTileId: typedPayload.toCenterId,
      toTileName: typedPayload.toCenterName,
    } as NavigationPayload,
  }
}