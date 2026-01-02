/**
 * Contract to API adapters for transforming domain contracts to API responses.
 *
 * These adapters bridge the domain layer contracts to API response shapes,
 * ensuring consistent field naming and structure for frontend consumers.
 */
import type {
  MapMappingContract as MapContract,
  MapItemMappingContract as MapItemContract,
} from "~/lib/domains/mapping";

/**
 * Transform a domain map item contract to an API map item contract.
 *
 * @param contract - The domain MapItemContract from the mapping domain
 * @returns API-shaped contract with itemType for semantic tile classification
 *
 * @remarks
 * The `itemType` field indicates the semantic classification of the tile:
 * - "user": Root tile for each user's map (system-controlled)
 * - "organizational": Structural grouping tiles (e.g., "Plans", "Interests")
 * - "context": Reference material tiles to explore on-demand
 * - "system": Executable capability tiles that can be invoked like a skill
 */
export const mapItemContractToApiAdapter = (contract: MapItemContract) => {
  return {
    id: contract.id,
    coordinates: contract.coords,
    depth: contract.depth,
    title: contract.title,
    content: contract.content,
    preview: contract.preview,
    link: contract.link,
    parentId: contract.parentId,
    /** Semantic tile type: "user", "organizational", "context", or "system" */
    itemType: contract.itemType,
    ownerId: contract.ownerId,
    originId: contract.originId,
    visibility: contract.visibility,
  };
};

/** API contract type for map items, including itemType for semantic classification */
export type MapItemAPIContract = ReturnType<typeof mapItemContractToApiAdapter>;

/**
 * Transform a root MapItem (USER type) to represent what was formerly a "map".
 *
 * @param contract - The domain MapContract representing a user's root tile
 * @returns API-shaped contract with itemType (always "user" for root tiles)
 */
export const mapRootItemContractToApiAdapter = (contract: MapContract) => {
  return {
    id: contract.id,
    userId: contract.userId,
    groupId: contract.groupId,
    title: contract.title,
    content: contract.content,
    itemCount: contract.itemCount,
    coordinates: contract.coords,
    /** Always "user" for root tiles */
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
