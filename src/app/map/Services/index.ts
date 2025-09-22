/**
 * Services Subsystem Index
 * 
 * Provides access to Services subsystem components for parent map level.
 * This prevents hierarchical dependency violations by enabling proper reexports.
 */

// Event Bus - Core system communication
export { EventBus, EventBusProvider, EventBusContext, useEventBus } from '~/app/map/Services/EventBus';
// Services must import parent types directly - no reexports from parent directories

// Prefetch Service - Data loading and caching
export {
  preloadUserMapData,
  transformApiItemsToTileData,
  savePreFetchedData,
  loadPreFetchedData,
  clearPreFetchedData,
  type PreFetchedMapData
} from '~/app/map/Services/PreFetch/pre-fetch-service';

// DragAndDrop Service - DOM-based drag and drop system
export {
  DOMBasedDragService,
  createDOMBasedDragService,
  useDOMBasedDrag,
  useTileRegistration,
  type DOMDragState,
  type TileGeometry,
  type DOMDragEvent,
  type UseDOMBasedDragReturn
} from '~/app/map/Services/DragAndDrop';

// External consumers must import types directly from ~/app/map/types - no reexports