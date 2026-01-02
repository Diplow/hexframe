import {
  type MapItemWithId,
  MapItem,
  type MapItemConstructorArgs,
} from "~/lib/domains/mapping/_objects/map-item";
import {
  BaseItem,
  type BaseItemWithId,
} from "~/lib/domains/mapping/_objects/base-item";
import type { Direction } from "~/lib/domains/mapping/utils";
import type { DbMapItemWithBase } from "~/lib/domains/mapping/infrastructure/map-item/types";

export function mapJoinedDbToDomain(
  joined: DbMapItemWithBase,
  neighbors: MapItemWithId[] = [],
): MapItemWithId {
  const dbMapItem = joined.map_items;
  const dbBaseItem = joined.base_items;

  if (!dbBaseItem) {
    throw new Error(
      `BaseItem data missing for MapItem ID ${dbMapItem.id} (refItemId: ${dbMapItem.refItemId})`,
    );
  }

  const baseItem = _createBaseItemWithId(dbBaseItem);
  const mapItemArgs = _buildMapItemArgs(dbMapItem, baseItem, neighbors);

  const mapItem = new MapItem(mapItemArgs);
  return mapItem as MapItemWithId;
}

export function pathToString(path: Direction[]): string {
  return path.join(",");
}

export function parsePathString(pathString: string | null): Direction[] {
  if (pathString === null || pathString === "") return [];
  return pathString.split(",").map(Number) as Direction[];
}

function _createBaseItemWithId(
  dbBaseItem: DbMapItemWithBase["base_items"],
): BaseItemWithId {
  return new BaseItem({
    id: dbBaseItem.id,
    attrs: {
      title: dbBaseItem.title,
      content: dbBaseItem.content,
      preview: dbBaseItem.preview ?? undefined,
      link: dbBaseItem.link ?? "",
    },
  }) as BaseItemWithId;
}

function _buildMapItemArgs(
  dbMapItem: DbMapItemWithBase["map_items"],
  baseItem: BaseItemWithId,
  neighbors: MapItemWithId[],
): MapItemConstructorArgs {
  return {
    id: dbMapItem.id,
    attrs: {
      parentId: dbMapItem.parentId,
      coords: {
        userId: dbMapItem.coord_user_id,
        groupId: dbMapItem.coord_group_id,
        path: parsePathString(dbMapItem.path),
      },
      itemType: dbMapItem.item_type,
      visibility: dbMapItem.visibility,
      baseItemId: dbMapItem.refItemId,
    },
    ref: baseItem,
    neighbors: neighbors,
    parent: null,
  };
}
