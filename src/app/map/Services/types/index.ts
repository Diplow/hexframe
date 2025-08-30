/**
 * Services-level types reexport index
 * 
 * Provides access to commonly needed types for Services subsystem components,
 * particularly focused on event handling and system coordination.
 */

// Event system types - primary focus for Services
export type {
  EventSource,
  AppEvent,
  SpecificAppEvent,
  EventListener,
  EventBusService,
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
  AuthStateChangedEvent
} from '../../types';

// Event validation schemas for Services
export {
  appEventSchema,
  validateEvent,
  safeValidateEvent,
  mapTileCreatedEventSchema,
  mapTileUpdatedEventSchema,
  mapTileDeletedEventSchema,
  chatMessageSentEventSchema,
  chatMessageReceivedEventSchema
} from '../../types';

// Core data types that Services might need
export type { TileData, TileState } from '~/app/map/types';
export type { URLInfo, URLSearchParams } from '~/app/map/types';

// Data transformation utilities
export { adapt } from '~/app/map/types';