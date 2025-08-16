/**
 * Public API for Cache subsystem
 * 
 * Consumers: Canvas, Tile components, Hierarchy, Page components, Chat/Agentic services, Test utilities
 */

// =============================================================================
// Main Provider and Hook
// =============================================================================

// Primary cache provider component
export { MapCacheProvider } from './provider'

// Cache context for SSR handling
export { MapCacheContext } from './provider'

// Main cache hook providing all operations
export { useMapCache } from './use-map-cache'

// Type for the hook return value
export type { MapCacheHook } from './types'

// Cache state type needed by AI services for context composition
export type { CacheState } from './State/types'

// Tile data type needed by external consumers
export type { TileData } from '../types/tile-data'