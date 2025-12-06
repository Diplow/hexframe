import type { MapItemWithId, BaseItemWithId, BaseItemVersion } from "~/lib/domains/mapping/_objects";
import { MapItemType, Visibility } from "~/lib/domains/mapping/_objects";
import { CoordSystem, type Coord } from "~/lib/domains/mapping/utils";

export const mapItemDomainToContractAdapter = (
  aggregate: MapItemWithId,
  ownerId: string,
) => {
  return {
    id: String(aggregate.id),
    ownerId,
    coords: CoordSystem.createId(aggregate.attrs.coords),
    title: aggregate.ref.attrs.title,
    content: aggregate.ref.attrs.content,
    preview: aggregate.ref.attrs.preview,
    link: aggregate.ref.attrs.link,
    itemType: aggregate.attrs.itemType,
    visibility: aggregate.attrs.visibility,
    depth: aggregate.attrs.coords.path.length,
    parentId: aggregate.attrs.parentId
      ? String(aggregate.attrs.parentId)
      : null,
    originId: aggregate.ref.attrs.originId
      ? String(aggregate.ref.attrs.originId)
      : null,
  };
};

export type MapItemContract = ReturnType<typeof mapItemDomainToContractAdapter>;
export { MapItemType, Visibility };

export interface MoveMapItemResult {
  modifiedItems: MapItemContract[];
  movedItemId: string;
  affectedCount: number;
}

/**
 * Adapts a root USER MapItem and its descendants to a MapContract.
 * MapContract represents a view of a single "map" tree.
 */
export const mapDomainToContractAdapter = (
  rootItem: MapItemWithId,
  descendants: MapItemWithId[],
) => {
  if (rootItem.id === undefined) {
    throw new Error("Cannot adapt map root item without an ID");
  }
  if (rootItem.attrs.itemType !== MapItemType.USER) {
    throw new Error(
      "MapContract can only be created from a USER type root MapItem.",
    );
  }

  const baseRef = rootItem.ref;
  const allItems = [rootItem, ...descendants];

  return {
    id: rootItem.id,
    coords: rootItem.attrs.coords,
    title: baseRef.attrs.title,
    content: baseRef.attrs.content,
    itemType: rootItem.attrs.itemType,
    userId: rootItem.attrs.coords.userId,
    groupId: rootItem.attrs.coords.groupId,
    itemCount: allItems.length,
    items: allItems.map((item) =>
      mapItemDomainToContractAdapter(item, item.attrs.coords.userId),
    ),
  };
};

export type MapContract = ReturnType<typeof mapDomainToContractAdapter>;

/**
 * Adapts a BaseItem domain entity to a contract for API responses.
 * Converts internal IDs to strings and exposes only safe data.
 */
export const baseItemDomainToContractAdapter = (
  baseItem: BaseItemWithId,
) => {
  return {
    id: String(baseItem.id),
    title: baseItem.attrs.title,
    content: baseItem.attrs.content,
    preview: baseItem.attrs.preview,
    link: baseItem.attrs.link,
  };
};

export type BaseItemContract = ReturnType<typeof baseItemDomainToContractAdapter>;

/**
 * Adapts a BaseItemVersion domain entity to a contract for API responses.
 * Exposes version history snapshot data.
 */
export const baseItemVersionDomainToContractAdapter = (
  version: BaseItemVersion,
) => {
  return {
    versionNumber: version.versionNumber,
    title: version.title,
    content: version.content,
    preview: version.preview,
    link: version.link,
    createdAt: version.createdAt,
    updatedBy: version.updatedBy,
  };
};

export type BaseItemVersionContract = ReturnType<typeof baseItemVersionDomainToContractAdapter>;

/**
 * Complete version history for a tile at specific coordinates
 */
export interface ItemHistoryContract {
  coords: Coord;
  currentVersion: BaseItemContract;
  versions: BaseItemVersionContract[];
  totalCount: number;
  hasMore: boolean;
}

export const adapt = {
  map: mapDomainToContractAdapter,
  mapItem: mapItemDomainToContractAdapter,
  baseItem: baseItemDomainToContractAdapter,
  baseItemVersion: baseItemVersionDomainToContractAdapter,
};
