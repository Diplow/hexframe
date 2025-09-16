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
  type CacheState
} from '~/app/map/Cache';

// Chat subsystem
export type { ChatMessage, ChatWidget } from '~/app/map/Chat';

// Canvas subsystem  
export { BaseTileLayout } from '~/app/map/Canvas';

// Services subsystem
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
  type PreFetchedMapData
} from '~/app/map/Services';

// Import missing types directly from their source
export type { AppEvent, EventListener, EventBusService } from '~/app/map/types';

// Types subsystem
export type { TileData, TileState, URLInfo, URLSearchParams } from '~/app/map/types';
export { adapt, getColor } from '~/app/map/types';