import type { NavigationOperations } from "~/app/map/Cache/types/handlers";

/**
 * Create navigation operation callbacks for the public MapCache API
 */
export function createNavigationCallbacks(navigationOperations: NavigationOperations) {
  const navigateToItem = async (itemIdentifier: string, options?: { pushToHistory?: boolean }) => {
    await navigationOperations.navigateToItem(itemIdentifier, options);
  };

  const updateCenter = (centerCoordId: string) => {
    navigationOperations.updateCenter(centerCoordId);
  };

  const prefetchForNavigation = async (itemCoordId: string) => {
    await navigationOperations.prefetchForNavigation(itemCoordId);
  };

  const toggleItemExpansionWithURL = (itemId: string) => {
    navigationOperations.toggleItemExpansionWithURL(itemId);
  };

  return {
    navigateToItem,
    updateCenter,
    prefetchForNavigation,
    toggleItemExpansionWithURL,
  };
}