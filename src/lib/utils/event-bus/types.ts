/**
 * Event-driven architecture types for cross-system communication
 *
 * This is a shared utility that can be used by both frontend and backend code.
 */

export type EventSource = 'map_cache' | 'chat_cache' | 'auth' | 'sync' | 'test' | 'debug-logger' | 'canvas' | 'agentic' | 'drag_service';

export interface AppEvent {
  type: string;
  source: EventSource;
  payload: unknown;
  timestamp?: Date;
}

// Map events
export interface MapTileCreatedEvent extends AppEvent {
  type: 'map.tile_created';
  source: 'map_cache';
  payload: {
    tileId: string;
    tileName: string;
    coordId: string;
    parentId?: string;
  };
}

export interface MapTileUpdatedEvent extends AppEvent {
  type: 'map.tile_updated';
  source: 'map_cache';
  payload: {
    tileId: string;
    tileName: string;
    coordId: string;
    changes: Record<string, unknown>;
  };
}

export interface MapTileDeletedEvent extends AppEvent {
  type: 'map.tile_deleted';
  source: 'map_cache';
  payload: {
    tileId: string;
    tileName: string;
    coordId: string;
  };
}

export interface MapTilesSwappedEvent extends AppEvent {
  type: 'map.tiles_swapped';
  source: 'map_cache';
  payload: {
    tile1Id: string;
    tile2Id: string;
    tile1Name: string;
    tile2Name: string;
  };
}

export interface MapTileMovedEvent extends AppEvent {
  type: 'map.tile_moved';
  source: 'map_cache';
  payload: {
    tileId: string;
    tileName: string;
    fromCoordId: string;
    toCoordId: string;
  };
}

export interface MapNavigationEvent extends AppEvent {
  type: 'map.navigation';
  source: 'map_cache';
  payload: {
    fromCenterId?: string;
    toCenterId: string;
    toCenterName: string;
  };
}

export interface MapExpansionChangedEvent extends AppEvent {
  type: 'map.expansion_changed';
  source: 'map_cache';
  payload: {
    tileId: string;
    tileName: string;
    expanded: boolean;
  };
}

export interface MapImportCompletedEvent extends AppEvent {
  type: 'map.import_completed';
  source: 'map_cache';
  payload: {
    importedTiles: Array<{
      tileId: string;
      tileName: string;
      coordId: string;
    }>;
    rootCoordId: string;
  };
}

// Chat events
export interface ChatMessageEvent extends AppEvent {
  type: 'chat.message_sent' | 'chat.message_received';
  source: 'chat_cache';
  payload: {
    message: string;
    actor: 'user' | 'system' | 'assistant';
  };
}

export interface ChatWidgetEvent extends AppEvent {
  type: 'chat.widget_opened' | 'chat.widget_closed';
  source: 'chat_cache';
  payload: {
    widgetType: string;
    widgetId: string;
  };
}

// Auth events
export interface AuthStateChangedEvent extends AppEvent {
  type: 'auth.login' | 'auth.logout';
  source: 'auth';
  payload: {
    userId?: string;
    userName?: string;
  };
}

// Union type of all specific events
export type SpecificAppEvent =
  | MapTileCreatedEvent
  | MapTileUpdatedEvent
  | MapTileDeletedEvent
  | MapTilesSwappedEvent
  | MapTileMovedEvent
  | MapNavigationEvent
  | MapExpansionChangedEvent
  | MapImportCompletedEvent
  | ChatMessageEvent
  | ChatWidgetEvent
  | AuthStateChangedEvent;

// Event listener type
export type EventListener<T extends AppEvent = AppEvent> = (event: T) => void;

// Event bus interface
export interface EventBusService {
  emit(event: AppEvent): void;
  on<T extends AppEvent = AppEvent>(eventType: string, listener: EventListener<T>): () => void;
  getListenerCount(eventType: string): number;
}
