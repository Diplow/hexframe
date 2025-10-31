/**
 * EventBus - Shared utility for cross-system event-driven communication
 *
 * This module can be used by both frontend and backend code.
 */

export { EventBus, eventBus } from '~/lib/utils/event-bus/event-bus';
export type {
  AppEvent,
  EventListener,
  EventBusService,
  EventSource,
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
  SpecificAppEvent
} from '~/lib/utils/event-bus/types';
