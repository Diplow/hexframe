/**
 * Public API for MapResolver subsystem
 * 
 * Purpose: Resolves map identifiers (database IDs or coordinates) to actual coordinates
 * Consumers: page.tsx, PageOrchestrator components
 */

// =============================================================================
// Main Provider and Hook
// =============================================================================

export { MapResolverProvider } from '~/app/map/MapResolver/provider'
export { useMapResolver } from '~/app/map/MapResolver/use-map-resolver'

// =============================================================================
// Types
// =============================================================================

export type { ResolvedMapInfo, MapResolverState } from '~/app/map/MapResolver/types'