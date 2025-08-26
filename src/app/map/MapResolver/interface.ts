/**
 * Public API for MapResolver subsystem
 * 
 * Purpose: Resolves map identifiers (database IDs or coordinates) to actual coordinates
 * Consumers: page.tsx, PageOrchestrator components
 */

// =============================================================================
// Main Provider and Hook
// =============================================================================

export { MapResolverProvider } from './provider'
export { useMapResolver } from './use-map-resolver'

// =============================================================================
// Types
// =============================================================================

export type { ResolvedMapInfo, MapResolverState } from './types'