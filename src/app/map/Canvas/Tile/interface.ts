/**
 * Public API for Canvas/Tile Subsystem
 * 
 * Consumers: Canvas (parent), external systems that need to render tiles
 */

// Base tile components for static rendering
export { BaseFrame } from './Base/BaseFrame'
export { BaseTileLayout } from './Base/BaseTileLayout'
export { BaseItemTile } from './Base/BaseItemTile'
export { BaseEmptyTile } from './Base/BaseEmptyTile'

// Dynamic base tile component (used by Canvas parent)
export { DynamicBaseTileLayout } from './Base/index'
export type { DynamicBaseTileLayoutProps } from './Base/index'

// Base component types
export type { 
  BaseTileLayoutProps,
  TileScale,
  TileColor,
  TileStroke,
  TileCursor
} from './Base/BaseTileLayout'
export type { BaseFrameProps } from './Base/BaseFrame'
export type { BaseItemTileProps } from './Base/BaseItemTile'  
export type { BaseEmptyTileProps } from './Base/BaseEmptyTile'

// Dynamic tile components
export { DynamicItemTile } from './Item/item'
export { DynamicEmptyTile } from './Empty/empty'

// Specialized tile components (used by external systems)
export { default as ErrorTile } from './Error/error'

// Tile utilities (frequently needed by external systems)  
export { getColorFromItem } from './Item/_utils/color'