/**
 * Internal exports for Cache subsystem
 *
 * This module provides internal utilities, coordinators, and builders
 * used by the Cache subsystem components (provider, use-map-cache).
 * These are NOT part of the public Cache API.
 */

// =============================================================================
// Provider Lifecycle
// =============================================================================

export {
  useInitialCacheState,
  useInitialCenterSetup,
  useDragServiceSetup,
  useGetStateFunction,
} from '~/app/map/Cache/Lifecycle/_provider/state-initialization';
export type { InitialStateConfig } from '~/app/map/Cache/Lifecycle/_provider/state-initialization';
export { useCacheLifecycle } from '~/app/map/Cache/Lifecycle/_provider/lifecycle-effects';
export type { LifecycleHookConfig } from '~/app/map/Cache/Lifecycle/_provider/lifecycle-effects';

// =============================================================================
// Coordinators
// =============================================================================

export { useCacheContextBuilder } from '~/app/map/Cache/Lifecycle/context-builder';
export type { ContextBuilderConfig } from '~/app/map/Cache/Lifecycle/context-builder';
export { useDataOperationsWrapper } from '~/app/map/Cache/Lifecycle/data-operations-wrapper';
export { useMutationOperations } from '~/app/map/Cache/Lifecycle/MutationCoordinator/use-mutation-operations';

// =============================================================================
// Callbacks
// =============================================================================

export { createQueryCallbacks } from '~/app/map/Cache/Lifecycle/_callbacks/query-callbacks';
export { createMutationCallbacks } from '~/app/map/Cache/Lifecycle/_callbacks/mutation-callbacks';
export { createNavigationCallbacks } from '~/app/map/Cache/Lifecycle/_callbacks/navigation-callbacks';
export { createHierarchyCallbacks } from '~/app/map/Cache/Lifecycle/_callbacks/hierarchy-callbacks';

// =============================================================================
// Operations
// =============================================================================

export { createSyncOperationsAPI } from '~/app/map/Cache/Lifecycle/_operations/sync-operations';
