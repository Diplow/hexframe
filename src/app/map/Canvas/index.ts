/**
 * Public API for Canvas Subsystem
 * 
 * Primary Consumer: Map Page
 * Secondary Consumers: External systems that need tile rendering capabilities
 */

// Main Canvas component
export { DynamicMapCanvas } from '~/app/map/Canvas/canvas';
export type { CenterInfo } from '~/app/map/Canvas/canvas';

// Lifecycle components for error handling and loading states
export { MapErrorBoundary } from '~/app/map/Canvas/LifeCycle/error-boundary'
export { MapLoadingSkeleton } from '~/app/map/Canvas/LifeCycle/loading-skeleton'

// Tile components - re-exported from Canvas/Tile subsystem
export { 
  BaseTileLayout,    // Core hexagonal tile layout (used by Hierarchy)
  ErrorTile,         // Error state tiles (used by Home)  
  DynamicItemTile,   // Dynamic item tiles (used by Frame)
  DynamicEmptyTile,  // Dynamic empty tiles (used by Frame)
  DynamicBaseTileLayout, // Dynamic base tile layout (used by Frame and tiles)
  getColorFromItem   // Utility for color extraction
} from './Tile'

// Tile types for external consumers
export type { 
  TileScale,
  TileColor,
  BaseTileLayoutProps,
  DynamicBaseTileLayoutProps
} from './Tile'

// Canvas contexts and hooks (used by tiles and frame)
export { 
  LegacyTileActionsContext,
  useCanvasTheme,
  useLegacyTileActionsContext,
  CanvasThemeContext
} from './_shared/contexts'
export type { 
  LegacyTileActionsContextValue,
  ThemeContextValue
} from './_shared/contexts'

// Cache reexports for Tile and other Canvas subsystems
export { 
  MapCacheProvider, 
  MapCacheContext, 
  useMapCache 
} from '../Cache';
export type { 
  MapCacheHook, 
  CacheState,
  TileData as CacheTileData
} from '../Cache';

// Shared hooks for Tile subsystem
export { useTileInteraction } from '~/app/map/Canvas/hooks/shared/useTileInteraction';