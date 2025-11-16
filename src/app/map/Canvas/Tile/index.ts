/**
 * Public API for Canvas/Tile Subsystem
 * 
 * Consumers: Canvas (parent), external systems that need to render tiles
 */

// Base tile components for static rendering
export {
  BaseFrame,
  BaseTileLayout,
  BaseItemTile,
  BaseEmptyTile,
  DynamicBaseTileLayout
} from '~/app/map/Canvas/Tile/Base'

// Base component types
export type {
  BaseTileLayoutProps,
  TileScale,
  TileColor,
  TileStroke,
  TileCursor,
  DynamicBaseTileLayoutProps
} from '~/app/map/Canvas/Tile/Base'
export type { BaseFrameProps } from '~/app/map/Canvas/Tile/Base/BaseFrame'
export type { BaseItemTileProps } from '~/app/map/Canvas/Tile/Base/_components/BaseItemTile'
export type { BaseEmptyTileProps } from '~/app/map/Canvas/Tile/Base/_components/BaseEmptyTile'

// Dynamic tile components
export { DynamicItemTile } from '~/app/map/Canvas/Tile/Item/item'
export { DynamicEmptyTile } from '~/app/map/Canvas/Tile/Empty/empty'

// Specialized tile components (used by external systems)
// ErrorTile removed - was unused dead code

// Tile utilities (frequently needed by external systems and internal subsystems)
export { getColorFromItem } from '~/app/map/Canvas/Tile/Item/_internals/utils/color'
export { calculateTileDimensions } from '~/app/map/Canvas/Tile/utils/dimensions'

// NOTE: MapCache reexports removed - Tile components now use callbacks
// Canvas should import MapCache directly and pass handlers as props

// NOTE: External reexports removed to fix architecture violations.
// Components should import these directly from their source modules:
// - import type { TileData, TileState } from '~/app/map/types/tile-data'
// - import type { URLInfo } from '~/app/map/types/url-info'
// - import { getColor, getTextColorForDepth, DEFAULT_MAP_COLORS } from '~/app/map/Canvas/types'
// - import { useTileInteraction } from '~/app/map/Canvas'

// Base types already exported above