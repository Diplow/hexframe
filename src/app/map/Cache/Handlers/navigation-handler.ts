import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { CacheAction, CacheState } from "~/app/map/Cache/State";
import type { DataOperations, NavigationOperations } from "~/app/map/Cache/types/handlers";
import type { ServerService } from "~/app/map/Cache/Services/types";
import type { EventBusService } from '~/app/map';
import { loggers } from "~/lib/debug/debug-logger";
import {
  executeNavigationToItem,
  loadItemFromServer,
  type NavigationResult,
  type NavigationOptions
} from "~/app/map/Cache/Handlers/_internals/navigation-core";
import {
  resolveItemIdentifier,
  updateExpandedItemsForNavigation,
  handleURLUpdate,
  performBackgroundTasks
} from "~/app/map/Cache/Handlers/_internals/navigation-utils";
import {
  updateURL,
  syncURLWithState,
  getMapContext,
  toggleItemExpansionWithURL
} from "~/app/map/Cache/Handlers/_internals/navigation-url-handlers";
import {
  emitNavigationEvent
} from "~/app/map/Cache/Handlers/_internals/navigation-event-handlers";
import {
  updateCenter,
  prefetchForNavigation,
  navigateWithoutURL
} from "~/app/map/Cache/Handlers/_internals/navigation-operations";

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

    return executeNavigationToItem(
      itemIdentifier,
      options,
      getState,
      dispatch,
      dataHandler,
      config.serverService,
      eventBus,
      (id) => resolveItemIdentifier(id, getState),
      (id) => loadItemFromServer(id, config.serverService!, dispatch),
      (coordId) => updateExpandedItemsForNavigation(coordId, getState(), dispatch),
      (item, coordId, expandedIds) => handleURLUpdate(item, coordId, expandedIds, options, dataHandler, getState),
      (coordId) => performBackgroundTasks(coordId, getState, dataHandler, config.serverService, dispatch),
      (fromCenter, toCoordId) => emitNavigationEvent(fromCenter, toCoordId, eventBus, getState)
    );
  };

  return {
    navigateToItem,
    updateCenter: (centerCoordId: string) => updateCenter(centerCoordId, dispatch),
    updateURL,
    prefetchForNavigation: (itemCoordId: string) => prefetchForNavigation(itemCoordId, dataHandler),
    syncURLWithState: () => syncURLWithState(getState),
    navigateWithoutURL: (itemCoordId: string) => navigateWithoutURL(itemCoordId, getState, dispatch, dataHandler),
    getMapContext: () => getMapContext(config.pathname, config.searchParams),
    toggleItemExpansionWithURL: (itemId: string) => toggleItemExpansionWithURL(itemId, getState, dispatch),
  } as NavigationOperations;
}


// Hook-based factory for use in React components
export function useNavigationHandler(
  dispatch: React.Dispatch<CacheAction>,
  getState: () => CacheState,
  dataHandler: DataOperations,
  serverService?: ServerService,
  eventBus?: EventBusService,
) {
  // Always call hooks unconditionally
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  return createNavigationHandler({
    dispatch,
    getState,
    dataHandler,
    serverService,
    router,
    searchParams,
    pathname,
    eventBus,
  });
}

// Factory function for testing with mocked dependencies
export function createNavigationHandlerForTesting(
  dispatch: React.Dispatch<CacheAction>,
  getState: () => CacheState,
  dataHandler: DataOperations,
  mockRouter?: { push: (url: string) => void; replace: (url: string) => void },
  mockSearchParams?: URLSearchParams,
  mockPathname?: string,
) {
  return createNavigationHandler({
    dispatch,
    getState,
    dataHandler,
    router: mockRouter,
    searchParams: mockSearchParams,
    pathname: mockPathname,
  });
}
