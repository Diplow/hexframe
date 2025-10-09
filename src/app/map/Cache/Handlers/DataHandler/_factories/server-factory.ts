import type { Dispatch } from "react";
import type { CacheAction, CacheState } from "~/app/map/Cache/State";
import { type useServerService } from "~/app/map/Cache/Services";
import { createDataHandler, type DataHandlerServices } from "~/app/map/Cache/Handlers/DataHandler/data-handler";

// Shared helper to create services object
function _createServicesFromServerService(serverService: ReturnType<typeof useServerService>): DataHandlerServices {
  return {
    server: {
      fetchItemsForCoordinate: serverService.fetchItemsForCoordinate,
    },
  };
}

// Factory function for creating with server service
export function createDataHandlerWithServerService(
  dispatch: Dispatch<CacheAction>,
  getState: () => CacheState,
  serverService: ReturnType<typeof useServerService>,
) {
  const services = _createServicesFromServerService(serverService);
  return createDataHandler({ dispatch, services, getState });
}
