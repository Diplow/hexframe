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
import { updateURL } from "~/app/map/Cache/Handlers/NavigationHandler/_url/navigation-url-handlers";
import {
  createNavigationDependencies
} from "~/app/map/Cache/Handlers/NavigationHandler/_helpers/_core/navigation-handler-helpers";
import {
  createBoundUpdateCenter,
  createBoundPrefetchForNavigation,
  createBoundSyncURLWithState,
  createBoundNavigateWithoutURL,
  createBoundGetMapContext,
  createBoundToggleItemExpansionWithURL,
} from "~/app/map/Cache/Handlers/NavigationHandler/_bindings/navigation-bindings";

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

  return {
    navigateToItem,
    updateCenter: createBoundUpdateCenter(dispatch),
    updateURL,
    prefetchForNavigation: createBoundPrefetchForNavigation(dataHandler),
    syncURLWithState: createBoundSyncURLWithState(getState),
    navigateWithoutURL: createBoundNavigateWithoutURL(getState, dispatch, dataHandler),
    getMapContext: createBoundGetMapContext(config.pathname, config.searchParams),
    toggleItemExpansionWithURL: createBoundToggleItemExpansionWithURL(getState, dispatch),
  } as NavigationOperations;
}


// Re-export factory functions
export {
  useNavigationHandler,
  createNavigationHandlerForTesting,
} from "~/app/map/Cache/Handlers/NavigationHandler/navigation-handler-factories";
