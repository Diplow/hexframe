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
export { MapLoadingSpinner } from '~/app/map/Canvas/LifeCycle/loading-spinner'

// Tile components - re-exported from Canvas/Tile subsystem
export { 
  BaseTileLayout,    // Core hexagonal tile layout (used by Hierarchy)
  // ErrorTile removed - was unused dead code
  DynamicItemTile,   // Dynamic item tiles (used by Frame)
  DynamicEmptyTile,  // Dynamic empty tiles (used by Frame)
  DynamicBaseTileLayout, // Dynamic base tile layout (used by Frame and tiles)
  getColorFromItem   // Utility for color extraction
} from '~/app/map/Canvas/Tile'

// Tile types for external consumers
export type {
  TileScale,
  TileColor,
  TileCursor,
  BaseTileLayoutProps,
  DynamicBaseTileLayoutProps
} from '~/app/map/Canvas/Tile'

// Canvas contexts and hooks (used by tiles and frame)
export { 
  LegacyTileActionsContext,
  useCanvasTheme,
  useLegacyTileActionsContext,
  CanvasThemeContext
} from '~/app/map/Canvas/_shared/contexts'
export type { 
  LegacyTileActionsContextValue,
  ThemeContextValue
} from '~/app/map/Canvas/_shared/contexts'

// Tile Actions Context and Provider (used by Map components)
export { TileActionsProvider, useTileActions } from '~/app/map/Canvas/TileActionsContext'
export type { TileActionsContextValue } from '~/app/map/Canvas/TileActionsContext'

// NOTE: Cache reexports removed to fix architecture violations.
// Canvas subsystems should import directly from ../Cache as needed.

// Shared hooks for Tile subsystem
export { useTileInteraction } from '~/app/map/Canvas/hooks/shared/useTileInteraction';