import type { api } from "~/commons/trpc/react";
import type { ServiceConfig } from "~/app/map/Cache/Services";
import { createCoordinateOperations } from "~/app/map/Cache/Services/server/_internals/coordinate-operations";
import { createItemOperations } from "~/app/map/Cache/Services/server/_internals/item-operations";

// Create query operations for the server service
export const createQueryOperations = (
  utils: ReturnType<typeof api.useUtils>,
  finalConfig: Required<ServiceConfig>
) => {
  const coordinateOps = createCoordinateOperations(utils, finalConfig);
  const itemOps = createItemOperations(utils, finalConfig);

  return {
    ...coordinateOps,
    ...itemOps,
  };
};