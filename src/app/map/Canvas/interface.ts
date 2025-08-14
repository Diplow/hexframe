/**
 * Public API for Canvas Subsystem
 * 
 * Primary Consumer: Map Page
 * Secondary Consumers: External systems that need tile rendering capabilities
 */

// Main Canvas component - renamed for clarity
export { DynamicMapCanvas as Canvas } from './index'
export type { CenterInfo } from './index'

// Lifecycle components for error handling and loading states
export { MapErrorBoundary } from './LifeCycle/error-boundary'
export { MapLoadingSkeleton } from './LifeCycle/loading-skeleton'

// Tile components - re-exported from Canvas/Tile subsystem
// These are available for external systems that need to render individual tiles
export { 
  BaseTileLayout,    // Core hexagonal tile layout (used by Hierarchy)
  ErrorTile          // Error state tiles (used by Home)
} from './Tile/interface'

// Tile types for external consumers
export type { 
  TileScale,
  TileColor,
  BaseTileLayoutProps
} from './Tile/interface'