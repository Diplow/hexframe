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

// Type for the hook return value
export type { MapCacheHook } from '~/app/map/Cache/types'

// Cache state type needed by AI services for context composition
export type { CacheState } from '~/app/map/Cache/State/types'

// Tile data type needed by external consumers
export type { TileData } from '~/app/map/types/tile-data'