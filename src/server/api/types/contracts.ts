/**
 * Contract to API adapters for transforming domain contracts to API responses
 */
import type {
  MapMappingContract as MapContract,
  MapItemMappingContract as MapItemContract,
} from "~/lib/domains/mapping/types";

/**
 * Transform a domain map item contract to an API map item contract
 */
export const mapItemContractToApiAdapter = (contract: MapItemContract) => {
  return {
    id: contract.id,
    coordinates: contract.coords,
    depth: contract.depth,
    name: contract.name,
    descr: contract.descr,
    url: contract.url,
    parentId: contract.parentId,
    itemType: contract.itemType,
    ownerId: contract.ownerId,
  };
};

export type MapItemAPIContract = ReturnType<typeof mapItemContractToApiAdapter>;

/**
 * Transform a root MapItem (USER type) to represent what was formerly a "map"
 */
export const mapRootItemContractToApiAdapter = (contract: MapContract) => {
  return {
    id: contract.id,
    userId: contract.userId,
    groupId: contract.groupId,
    title: contract.title,
    descr: contract.descr,
    itemCount: contract.itemCount,
    coordinates: contract.coords,
    itemType: contract.itemType,
  };
};

export type MapRootItemAPIContract = ReturnType<
  typeof mapRootItemContractToApiAdapter
>;

/**
 * Export all adapters in a single object
 */
export const contractToApiAdapters = {
  mapItem: mapItemContractToApiAdapter,
  mapRootItem: mapRootItemContractToApiAdapter,
};
