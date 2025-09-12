/**
 * Public API for Canvas/Tile Subsystem
 * 
 * Consumers: Canvas (parent), external systems that need to render tiles
 */

// Base tile components for static rendering
export { BaseFrame } from './Base/BaseFrame'
export { BaseTileLayout } from './Base/BaseTileLayout'
export { BaseItemTile } from './Base/_components/BaseItemTile'
export { BaseEmptyTile } from './Base/_components/BaseEmptyTile'

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
export type { BaseItemTileProps } from './Base/_components/BaseItemTile'  
export type { BaseEmptyTileProps } from './Base/_components/BaseEmptyTile'

// Dynamic tile components
export { DynamicItemTile } from './Item/item'
export { DynamicEmptyTile } from './Empty/empty'

// Specialized tile components (used by external systems)
// ErrorTile removed - was unused dead code

// Tile utilities (frequently needed by external systems and internal subsystems)  
export { getColorFromItem } from './Item/_internals/utils/color'

// NOTE: MapCache reexports removed - Tile components now use callbacks
// Canvas should import MapCache directly and pass handlers as props

// NOTE: External reexports removed to fix architecture violations.
// Components should import these directly from their source modules:
// - import type { TileData, TileState } from '~/app/map/types/tile-data'
// - import type { URLInfo } from '~/app/map/types/url-info'
// - import { getColor, getTextColorForDepth, DEFAULT_MAP_COLORS } from '~/app/map/Canvas/types'
// - import { useTileInteraction } from '~/app/map/Canvas'

// Base types already exported above