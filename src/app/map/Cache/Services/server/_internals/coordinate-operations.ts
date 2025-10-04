import { CoordSystem } from "~/lib/domains/mapping/utils";
import type { api } from "~/commons/trpc/react";
import type { ServiceConfig } from "~/app/map/Cache/Services";
import { _validateAndParseCoordinate } from "~/app/map/Cache/Services/server/_internals/_coordinate-validation";
import { _fetchSpecificItemWithGenerations, _fetchRootItems } from "~/app/map/Cache/Services/server/_internals/_fetching-operations";
import { _flattenMixedResult, type FetchedMapItem } from "~/app/map/Cache/Services/server/_internals/_result-flattening";
import { _wrapOperation } from "~/app/map/Cache/Services/server/_internals/_operation-wrapper";

/**
 * Create coordinate-based query operations
 */
export function createCoordinateOperations(
  utils: ReturnType<typeof api.useUtils>,
  finalConfig: Required<ServiceConfig>
) {
  const fetchItemsForCoordinate = async (params: {
    centerCoordId: string;
    maxDepth: number;
  }): Promise<FetchedMapItem[]> => {
    return _wrapOperation(async () => {
      const coords = _validateAndParseCoordinate(params.centerCoordId);
      if (!coords) {
        return [];
      }

      // If this is a specific item (has a path), fetch it with descendants
      if (coords.path && coords.path.length > 0) {
        return _fetchSpecificItemWithGenerations(utils, coords, params.maxDepth);
      }

      // For root-level queries (no path), fetch all items for this root
      return _fetchRootItems(utils, coords);
    }, finalConfig);
  };

  const getItemByCoordinate = async (coordId: string) => {
    return _wrapOperation(async () => {
      const coords = CoordSystem.parseId(coordId);
      const item = await utils.map.getItemByCoords.fetch({
        coords: coords,
      });
      // If the API returns an array, take the first item, otherwise return the item or null
      if (Array.isArray(item)) {
        return item[0] ?? null;
      }
      return item;
    }, finalConfig);
  };

  const getItemWithGenerations = async (params: {
    coordId: string;
    generations: number;
  }): Promise<FetchedMapItem[]> => {
    return _wrapOperation(async () => {
      const coords = CoordSystem.parseId(params.coordId);
      const items = await utils.map.getItemByCoords.fetch({
        coords: coords,
        generations: params.generations,
      });
      return _flattenMixedResult(items);
    }, finalConfig);
  };

  return {
    fetchItemsForCoordinate,
    getItemByCoordinate,
    getItemWithGenerations,
  };
}