import type { CacheAction, CacheState } from "~/app/map/Cache/State";
import type { DataOperations } from "~/app/map/Cache/types/handlers";
import type { ServerService } from "~/app/map/Cache/Services";
import type { EventBusService } from '~/app/map';
import type { TileData } from "~/app/map/types";
import {
  handleURLUpdate,
  performBackgroundTasks
} from "~/app/map/Cache/Handlers/NavigationHandler/navigation-utils";
import {
  emitNavigationEvent
} from "~/app/map/Cache/Handlers/NavigationHandler/_helpers/navigation-event-handlers";
import type { NavigationOptions } from "~/app/map/Cache/Handlers/NavigationHandler/_core/navigation-core";

/**
 * Helper functions for binding navigation dependencies
 */
export function createURLHandler(
  options: NavigationOptions,
  dataHandler: DataOperations,
  getState: () => CacheState
) {
  return (item: TileData | undefined, coordId: string, expandedIds: string[]) =>
    handleURLUpdate(item, coordId, expandedIds, options, dataHandler, getState);
}

export function createTasksHandler(
  getState: () => CacheState,
  dataHandler: DataOperations,
  serverService: ServerService | undefined,
  dispatch: React.Dispatch<CacheAction>
) {
  return (coordId: string) =>
    performBackgroundTasks(coordId, getState, dataHandler, serverService, dispatch);
}

export function createEventEmitter(
  eventBus: EventBusService | undefined,
  getState: () => CacheState
) {
  return (fromCenter: string | null, toCoordId: string) =>
    emitNavigationEvent(fromCenter, toCoordId, eventBus, getState);
}
