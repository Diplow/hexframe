/**
 * Public API for Cache subsystem
 * 
 * Consumers: Canvas, Tile components, Hierarchy, Page components, Chat/Agentic services, Test utilities
 */

// =============================================================================
// Main Provider and Hook
// =============================================================================

// Primary cache provider component
export { MapCacheProvider } from '~/app/map/Cache/provider'

// Cache context for SSR handling
export { MapCacheContext } from '~/app/map/Cache/provider'

// Main cache hook providing all operations
export { useMapCache } from '~/app/map/Cache/use-map-cache'

// Specialized hooks for performance optimization
export { useMapCacheCenter } from '~/app/map/Cache/use-map-cache'
export { useMapCachePendingOps } from '~/app/map/Cache/use-map-cache'
export { useMapCacheQuery } from '~/app/map/Cache/use-map-cache'
export { useMapCacheNavigation } from '~/app/map/Cache/use-map-cache'

// Type for the hook return value
export type { MapCacheHook } from '~/app/map/Cache/types'

// Cache state type needed by AI services for context composition
export type { CacheState } from '~/app/map/Cache/State/types'

// NOTE: TileData type reexport removed to fix architecture violations.
// Consumers should import TileData directly from '~/app/map/types/tile-data'