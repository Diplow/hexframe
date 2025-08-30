/**
 * Canvas-level types reexport index
 * 
 * Provides access to commonly needed types for Canvas subsystem components,
 * preventing deep hierarchical imports like ../../../../types/tile-data
 */

// Most commonly needed map types
export type { TileData, TileState } from '~/app/map/types';
export { adapt, getColor } from '~/app/map/types';

// URL and navigation types
export type { URLInfo, URLSearchParams } from '~/app/map/types';

// Theme and styling types
export { directionToClassAbbr, getSemanticColorClass, getTextColorForDepth } from '~/app/map/types';

// Event types for Canvas-Chat communication
export type { 
  AppEvent, 
  EventSource,
  EventListener,
  MapTileCreatedEvent,
  MapTileUpdatedEvent,
  MapTileDeletedEvent,
  MapTileMovedEvent,
  MapTilesSwappedEvent
} from '../../types';

// Constants used by Tile subsystem
export { DEFAULT_MAP_COLORS } from '~/app/map/constants';