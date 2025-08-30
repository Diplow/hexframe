/**
 * Services Subsystem Index
 * 
 * Provides access to Services subsystem components for parent map level.
 * This prevents hierarchical dependency violations by enabling proper reexports.
 */

// Event Bus - Core system communication
export { EventBus, EventBusProvider, EventBusContext, useEventBus } from '~/app/map/Services/EventBus';
export type { AppEvent, EventListener, EventBusService } from './types';

// Prefetch Service - Data loading and caching
export { 
  preloadUserMapData, 
  transformApiItemsToTileData,
  savePreFetchedData,
  loadPreFetchedData,
  clearPreFetchedData,
  type PreFetchedMapData
} from './PreFetch/pre-fetch-service';

// Service-level types - Reexported for child subsystems
export type {
  EventSource,
  SpecificAppEvent,
  MapTileCreatedEvent,
  MapTileUpdatedEvent,
  MapTileDeletedEvent,
  MapTilesSwappedEvent,
  MapTileMovedEvent,
  MapNavigationEvent,
  MapExpansionChangedEvent,
  MapImportCompletedEvent,
  ChatMessageEvent,
  ChatWidgetEvent,
  AuthStateChangedEvent,
  TileData,
  TileState,
  URLInfo,
  URLSearchParams
} from './types';