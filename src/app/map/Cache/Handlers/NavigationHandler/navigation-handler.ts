import type { CacheAction, CacheState } from "~/app/map/Cache/State";
import type { DataOperations, NavigationOperations } from "~/app/map/Cache/types/handlers";
import type { ServerService } from "~/app/map/Cache/Services";
import type { EventBusService } from '~/app/map';
import { loggers } from "~/lib/debug/debug-logger";
import {
  executeNavigationToItem,
  type NavigationResult,
  type NavigationOptions
} from "~/app/map/Cache/Handlers/NavigationHandler/_core/navigation-core";
import {
  updateURL,
  syncURLWithState,
  getMapContext,
  toggleItemExpansionWithURL
} from "~/app/map/Cache/Handlers/NavigationHandler/_url/navigation-url-handlers";
import {
  updateCenter,
  prefetchForNavigation,
  navigateWithoutURL
} from "~/app/map/Cache/Handlers/NavigationHandler/_core/navigation-operations";
import {
  createNavigationDependencies
} from "~/app/map/Cache/Handlers/NavigationHandler/_helpers/navigation-handler-helpers";

export interface NavigationHandlerConfig {
  dispatch: React.Dispatch<CacheAction>;
  getState: () => CacheState;
  dataHandler: DataOperations;
  serverService?: ServerService;
  eventBus?: EventBusService;
  // For testing, we can inject these dependencies
  router?: {
    push: (url: string) => void;
    replace: (url: string) => void;
  };
  searchParams?: URLSearchParams;
  pathname?: string;
}



export function createNavigationHandler(config: NavigationHandlerConfig) {
  const { dispatch, getState, dataHandler, eventBus } = config;

  const navigateToItem = async (
    itemIdentifier: string,
    options: NavigationOptions = {},
  ): Promise<NavigationResult> => {
    loggers.mapCache.handlers('[NavigationHandler.navigateToItem] Called with:', {
      itemIdentifier,
      options,
      timestamp: new Date().toISOString(),
      stackTrace: new Error().stack
    });

    const deps = createNavigationDependencies(
      getState,
      dispatch,
      dataHandler,
      config.serverService,
      eventBus,
      options
    );

    return executeNavigationToItem(itemIdentifier, options, deps);
  };

  // Binding functions to reduce inline arrow function count
  const boundUpdateCenter = (centerCoordId: string) => updateCenter(centerCoordId, dispatch);
  const boundPrefetchForNavigation = (itemCoordId: string) => prefetchForNavigation(itemCoordId, dataHandler);
  const boundSyncURLWithState = () => syncURLWithState(getState);
  const boundNavigateWithoutURL = (itemCoordId: string) => navigateWithoutURL(itemCoordId, getState, dispatch, dataHandler);
  const boundGetMapContext = () => getMapContext(config.pathname, config.searchParams);
  const boundToggleItemExpansionWithURL = (itemId: string) => toggleItemExpansionWithURL(itemId, getState, dispatch);

  return {
    navigateToItem,
    updateCenter: boundUpdateCenter,
    updateURL,
    prefetchForNavigation: boundPrefetchForNavigation,
    syncURLWithState: boundSyncURLWithState,
    navigateWithoutURL: boundNavigateWithoutURL,
    getMapContext: boundGetMapContext,
    toggleItemExpansionWithURL: boundToggleItemExpansionWithURL,
  } as NavigationOperations;
}


// Re-export factory functions
export {
  useNavigationHandler,
  createNavigationHandlerForTesting,
} from "~/app/map/Cache/Handlers/NavigationHandler/navigation-handler-factories";
