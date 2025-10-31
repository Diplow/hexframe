/**
 * Event-driven architecture types for cross-system communication
 *
 * Re-exports from shared utilities for backward compatibility.
 */

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
} from '~/lib/utils/event-bus';