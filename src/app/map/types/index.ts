/**
 * Map-level types reexport index
 * 
 * This index provides a centralized access point for all map-related types,
 * fixing hierarchical dependency violations by allowing subsystems to import
 * types from their nearest parent level instead of reaching deep into the hierarchy.
 */

// Tile data types - the most commonly imported
export type { TileData, TileState } from '~/app/map/types/tile-data';
export { adapt, getColor } from '~/app/map/types/tile-data';

// URL and navigation types
export type { URLInfo, URLSearchParams } from '~/app/map/types/url-info';

// Theme and color types
export { directionToClassAbbr, getSemanticColorClass, getTextColorForDepth } from '~/app/map/types/theme-colors';

// Event system types - for cross-system communication
export type {
  EventSource,
  AppEvent,
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
  SpecificAppEvent,
  EventListener,
  EventBusService
} from '~/app/map/types/events';

// Event validation schemas
export {
  mapTileSelectedEventSchema,
  mapTileCreatedEventSchema,
  mapTileUpdatedEventSchema,
  mapTileDeletedEventSchema,
  mapTilesSwappedEventSchema,
  mapTileMovedEventSchema,
  mapNavigationEventSchema,
  mapExpansionChangedEventSchema,
  mapImportCompletedEventSchema,
  chatMessageSentEventSchema,
  chatMessageReceivedEventSchema,
  chatWidgetOpenedEventSchema,
  chatWidgetClosedEventSchema,
  authLoginEventSchema,
  authLogoutEventSchema,
  authRequiredEventSchema,
  errorOccurredEventSchema,
  mapEditRequestedEventSchema,
  mapDeleteRequestedEventSchema,
  mapCreateRequestedEventSchema,
  appEventSchema,
  validateEvent,
  safeValidateEvent
} from '~/app/map/types/event-schemas';