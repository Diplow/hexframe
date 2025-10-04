import { type api } from "~/commons/trpc/react";
import type { CacheAction, CacheState } from "~/app/map/Cache/State";
import {
  createServerService,
  type useServerService,
} from "~/app/map/Cache/Services";
import { createDataHandler, type DataHandlerServices } from "~/app/map/Cache/Handlers/DataHandler/data-handler";

// Shared helper to create services object
function _createServicesFromServerService(serverService: ReturnType<typeof useServerService>): DataHandlerServices {
  return {
    server: {
      fetchItemsForCoordinate: serverService.fetchItemsForCoordinate,
    },
  };
}

// Pure factory function for easier testing
export function createDataHandlerWithMockableService(
  dispatch: React.Dispatch<CacheAction>,
  getState: () => CacheState,
  utils: ReturnType<typeof api.useUtils>,
  serviceConfig?: Parameters<typeof createServerService>[1],
) {
  const serverService = createServerService(utils, serviceConfig);
  const services = _createServicesFromServerService(serverService);
  return createDataHandler({ dispatch, services, getState });
}
