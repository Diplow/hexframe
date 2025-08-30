/**
 * Public API for Canvas/Tile Subsystem
 * 
 * Consumers: Canvas (parent), external systems that need to render tiles
 */

// Base tile components for static rendering
export { BaseFrame } from '~/app/map/Canvas/Tile/Base/BaseFrame'
export { BaseTileLayout } from '~/app/map/Canvas/Tile/Base/BaseTileLayout'
export { BaseItemTile } from '~/app/map/Canvas/Tile/Base/BaseItemTile'
export { BaseEmptyTile } from '~/app/map/Canvas/Tile/Base/BaseEmptyTile'

// Dynamic base tile component (used by Canvas parent)
export { DynamicBaseTileLayout } from '~/app/map/Canvas/Tile/Base/index'
export type { DynamicBaseTileLayoutProps } from '~/app/map/Canvas/Tile/Base/index'

// Base component types
export type { 
  BaseTileLayoutProps,
  TileScale,
  TileColor,
  TileStroke,
  TileCursor
} from './Base/BaseTileLayout'
export type { BaseFrameProps } from '~/app/map/Canvas/Tile/Base/BaseFrame'
export type { BaseItemTileProps } from '~/app/map/Canvas/Tile/Base/BaseItemTile'  
export type { BaseEmptyTileProps } from '~/app/map/Canvas/Tile/Base/BaseEmptyTile'

// Dynamic tile components
export { DynamicItemTile } from '~/app/map/Canvas/Tile/Item/item'
export { DynamicEmptyTile } from '~/app/map/Canvas/Tile/Empty/empty'

// Specialized tile components (used by external systems)
export { default as ErrorTile } from '~/app/map/Canvas/Tile/Error/error'

// Tile utilities (frequently needed by external systems and internal subsystems)  
export { getColorFromItem } from '~/app/map/Canvas/Tile/Item/_utils/color'

// NOTE: MapCache reexports removed - Tile components now use callbacks
// Canvas should import MapCache directly and pass handlers as props

// Tile subsystem type reexports for internal components
export type { TileData, TileState } from '~/app/map/types/tile-data';
export type { URLInfo } from '~/app/map/types/url-info';
export { getColor, getTextColorForDepth, DEFAULT_MAP_COLORS } from '~/app/map/Canvas/types';
export { useTileInteraction } from '~/app/map/Canvas';

// Base types already exported above