/**
 * Map Subsystem Interface
 * 
 * Main public API for the map application.
 * Re-exports interfaces from all map subsystems.
 */

// Cache subsystem
export { 
  MapCacheProvider,
  MapCacheContext,
  useMapCache,
  type MapCacheHook,
  type CacheState,
  type TileData
} from './Cache';

// Chat subsystem
export type { ChatMessage, ChatWidget } from '~/app/map/Chat';

// Canvas subsystem  
export { ErrorTile, BaseTileLayout } from '~/app/map/Canvas';

// EventBus subsystem
export {
  EventBus,
  EventBusProvider,
  EventBusContext,
  useEventBus,
  type AppEvent,
  type EventListener,
  type EventBusService
} from './Services/EventBus';