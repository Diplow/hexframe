/**
 * Services Subsystem Index
 * 
 * Provides access to Services subsystem components for parent map level.
 * This prevents hierarchical dependency violations by enabling proper reexports.
 */

// Event Bus - Core system communication
export { EventBus, eventBus, EventBusProvider, EventBusContext, useEventBus } from '~/app/map/Services/EventBus';
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

// DragAndDrop Service - Global drag and drop system
export {
  globalDragService,
  validateDragOperation,
  canDragTile,
  canDropOnTile,
  isCenterTile,
  type TileDropTarget,
  type DragOperation,
  type DropHandler,
  type ValidationHandler
} from '~/app/map/Services/DragAndDrop';

// TilePosition Service - Global tile position lookup
export {
  globalTilePositionService,
  type TilePosition
} from '~/app/map/Services/TilePosition';

// Operations Service - Pending cache operations tracking
export {
  OperationsProvider,
  useOperations,
  usePendingOperations,
  type PendingOperations,
  type OperationType,
  type CacheOperationEvent
} from '~/app/map/Services/Operations';

// External consumers must import types directly from ~/app/map/types - no reexports