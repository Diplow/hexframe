import type { Dispatch } from "react";
import type { CacheAction, CacheState } from "~/app/map/Cache/State";
import type { DataOperations } from "~/app/map/Cache/types/handlers";
import type { ServerService } from "~/app/map/Cache/Services";
import type { EventBusService } from '~/app/map';
import {
  resolveItemIdentifier,
  updateExpandedItemsForNavigation,
} from "~/app/map/Cache/Handlers/NavigationHandler/navigation-utils";
import {
  loadItemFromServer
} from "~/app/map/Cache/Handlers/NavigationHandler/_core/navigation-core";
import {
  createURLHandler,
  createTasksHandler,
  createEventEmitter
} from "~/app/map/Cache/Handlers/NavigationHandler/_helpers/_events/navigation-dependency-binders";
import type { NavigationOptions, NavigationDependencies } from "~/app/map/Cache/Handlers/NavigationHandler/_core/navigation-core";

/**
 * Creates the dependency object for navigation operations
 * Extracts arrow functions to reduce function count in main handler
 */
export function createNavigationDependencies(
  getState: () => CacheState,
  dispatch: Dispatch<CacheAction>,
  dataHandler: DataOperations,
  serverService: ServerService | undefined,
  eventBus: EventBusService | undefined,
  options: NavigationOptions
): NavigationDependencies {
  return {
    getState,
    dispatch,
    dataHandler,
    serverService,
    eventBus,
    resolveItemIdentifier: (id) => resolveItemIdentifier(id, getState),
    loadItemFromServer: (id) => loadItemFromServer(id, serverService!, dispatch),
    updateExpandedItems: (coordId) => updateExpandedItemsForNavigation(coordId, getState(), dispatch),
    handleURLUpdate: createURLHandler(options, dataHandler, getState),
    performBackgroundTasks: createTasksHandler(getState, dataHandler, serverService, dispatch),
    emitNavigationEvent: createEventEmitter(eventBus, getState)
  };
}
