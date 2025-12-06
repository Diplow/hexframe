// ============================================================================
// ACTION CREATORS - Re-export all actions for backward compatibility
// ============================================================================

// Data actions
export {
  loadRegion,
  loadItemChildren,
  updateItems,
  removeItem,
  createLoadRegionAction,
  createLoadItemChildrenAction,
} from '~/app/map/Cache/State/actions/data';

// Navigation actions
export {
  setCenter,
  setExpandedItems,
  toggleItemExpansion,
  createSetCenterAction,
} from '~/app/map/Cache/State/actions/navigation';

// System actions
export {
  setLoading,
  setError,
  invalidateRegion,
  invalidateAll,
  setAuthTransitioning,
  updateCacheConfig,
  createOptimisticUpdateActions,
  createErrorHandlingActions,
  createBatchActions,
} from '~/app/map/Cache/State/actions/system';

// Composition actions
export {
  toggleCompositionExpansion,
  setCompositionExpansion,
} from '~/app/map/Cache/State/actions/composition';

// ============================================================================
// GROUPED ACTION CREATORS - for better organization
// ============================================================================

import * as dataActions from '~/app/map/Cache/State/actions/data';
import * as navigationActions from '~/app/map/Cache/State/actions/navigation';
import * as systemActions from '~/app/map/Cache/State/actions/system';
import * as compositionActions from '~/app/map/Cache/State/actions/composition';

export const cacheActions = {
  // Data actions
  loadRegion: dataActions.loadRegion,
  loadItemChildren: dataActions.loadItemChildren,
  updateItems: dataActions.updateItems,
  removeItem: dataActions.removeItem,

  // Navigation actions
  setCenter: navigationActions.setCenter,
  setExpandedItems: navigationActions.setExpandedItems,
  toggleItemExpansion: navigationActions.toggleItemExpansion,

  // Composition actions
  toggleCompositionExpansion: compositionActions.toggleCompositionExpansion,
  setCompositionExpansion: compositionActions.setCompositionExpansion,

  // System actions
  setLoading: systemActions.setLoading,
  setError: systemActions.setError,
  invalidateRegion: systemActions.invalidateRegion,
  invalidateAll: systemActions.invalidateAll,
  setAuthTransitioning: systemActions.setAuthTransitioning,
  updateCacheConfig: systemActions.updateCacheConfig,
};
