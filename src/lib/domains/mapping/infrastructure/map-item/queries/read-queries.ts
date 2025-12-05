import { eq, inArray, type SQL, sql, and } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { schema as schemaImport } from "~/server/db";
const { mapItems, baseItems } = schemaImport;

import {
  type MapItemWithId,
  Visibility,
} from "~/lib/domains/mapping/_objects/map-item";
import type { Direction } from "~/lib/domains/mapping/utils";
import type { DbMapItemWithBase } from "~/lib/domains/mapping/infrastructure/map-item/types";
import { mapJoinedDbToDomain, pathToString } from "~/lib/domains/mapping/infrastructure/map-item/mappers";
import { buildVisibilityFilter, buildMultiOwnerVisibilityFilter } from "~/lib/domains/mapping/infrastructure/map-item/queries/visibility-filter";

export class ReadQueries {
  constructor(private db: PostgresJsDatabase<typeof schemaImport>) {}

  async fetchItemWithBase(
    id: number,
    requesterUserId?: string
  ): Promise<DbMapItemWithBase> {
    const result = await this.db
      .select()
      .from(mapItems)
      .leftJoin(baseItems, eq(mapItems.refItemId, baseItems.id))
      .where(eq(mapItems.id, id))
      .limit(1);

    if (!result[0]?.map_items || !result[0]?.base_items) {
      throw new Error(`MapItem with id ${id} not found or baseItem missing.`);
    }

    // Apply visibility filter after fetching to check ownership
    const ownerUserId = result[0].map_items.coord_user_id;
    const visibilityFilter = buildVisibilityFilter(requesterUserId, ownerUserId);

    // If filter exists and item is not public, deny access
    if (visibilityFilter && result[0].map_items.visibility !== Visibility.PUBLIC) {
      throw new Error(`MapItem with id ${id} not found or baseItem missing.`);
    }

    return result[0] as DbMapItemWithBase;
  }

  async fetchNeighbors(
    parentId: number,
    requesterUserId?: string
  ): Promise<MapItemWithId[]> {
    // Build filter for multi-owner scenario (neighbors may have different owners)
    const visibilityFilter = buildMultiOwnerVisibilityFilter(requesterUserId);

    const neighborResults = await this.db
      .select()
      .from(mapItems)
      .leftJoin(baseItems, eq(mapItems.refItemId, baseItems.id))
      .where(and(eq(mapItems.parentId, parentId), visibilityFilter));

    return neighborResults
      .filter((r) => r.map_items && r.base_items)
      .map((r) => mapJoinedDbToDomain(r as DbMapItemWithBase));
  }

  async findItemIdByCoords(
    coords: {
      userId: string;
      groupId: number;
      path: Direction[];
    },
    requesterUserId?: string
  ): Promise<number | undefined> {
    const { userId, groupId, path } = coords;
    const pathString = pathToString(path);

    // Build visibility filter for the owner of this tile
    const visibilityFilter = buildVisibilityFilter(requesterUserId, userId);

    const whereClauses: SQL[] = [
      eq(mapItems.coord_user_id, userId),
      eq(mapItems.coord_group_id, groupId),
      eq(mapItems.path, pathString),
    ];

    // Add visibility filter if present
    if (visibilityFilter) {
      whereClauses.push(visibilityFilter);
    }

    const mapItemResult = await this.db
      .select({ id: mapItems.id })
      .from(mapItems)
      .where(sql.join(whereClauses, sql` AND `))
      .limit(1);

    return mapItemResult[0]?.id;
  }

  async fetchManyByIds(
    ids: number[],
    { limit = 50, offset = 0 }: { limit?: number; offset?: number },
    requesterUserId?: string
  ): Promise<DbMapItemWithBase[]> {
    // Build filter for multi-owner scenario
    const visibilityFilter = buildMultiOwnerVisibilityFilter(requesterUserId);

    const results = await this.db
      .select()
      .from(mapItems)
      .leftJoin(baseItems, eq(mapItems.refItemId, baseItems.id))
      .where(and(inArray(mapItems.id, ids), visibilityFilter))
      .orderBy(mapItems.id)
      .limit(limit)
      .offset(offset);

    return results.filter(
      (r) => r.map_items && r.base_items,
    ) as DbMapItemWithBase[];
  }

  async fetchMany(
    {
      limit = 50,
      offset = 0,
    }: {
      limit?: number;
      offset?: number;
    },
    requesterUserId?: string
  ): Promise<DbMapItemWithBase[]> {
    // Build filter for multi-owner scenario
    const visibilityFilter = buildMultiOwnerVisibilityFilter(requesterUserId);

    const results = await this.db
      .select()
      .from(mapItems)
      .leftJoin(baseItems, eq(mapItems.refItemId, baseItems.id))
      .where(visibilityFilter)
      .orderBy(mapItems.id)
      .limit(limit)
      .offset(offset);

    return results.filter(
      (r) => r.map_items && r.base_items,
    ) as DbMapItemWithBase[];
  }
}
