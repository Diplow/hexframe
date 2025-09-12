// Re-export all selectors from organized modules
export * from './basic';
export * from './items';
export * from './regions';
export * from './navigation';
export { cacheSelectors, staticSelectors } from './composite';

// Create default selectors instance for backward compatibility  
import { cacheSelectors } from './composite';

// Import the initial state type to avoid circular dependencies
const createDefaultSelectors = () => {
  // This will be populated when the reducer is imported
  const initialState = {
    itemsById: {},
    currentCenter: null,
    expandedItemIds: [],
    isLoading: false,
    error: null,
    lastUpdated: 0,
    regionMetadata: {},
    cacheConfig: { 
      maxAge: 300000,
      backgroundRefreshInterval: 60000,
      enableOptimisticUpdates: true,
      maxDepth: 6
    }
  };
  
  return cacheSelectors(initialState);
};

export const defaultSelectors = createDefaultSelectors();