/**
 * Timeline Services Interface
 * 
 * Reexports services needed by Timeline widgets to avoid deep imports.
 */

// EventBus services for Timeline widgets - re-exported from parent
export {
  EventBus,
  EventBusProvider, 
  EventBusContext,
  useEventBus,
  preloadUserMapData,
  transformApiItemsToTileData,
  savePreFetchedData,
  loadPreFetchedData,
  clearPreFetchedData,
  type AppEvent,
  type EventListener,
  type EventBusService,
  type PreFetchedMapData
} from '../../services';