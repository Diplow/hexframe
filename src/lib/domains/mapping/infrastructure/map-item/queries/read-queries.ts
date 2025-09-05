import { eq, inArray, type SQL, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { schema as schemaImport } from "~/server/db";
const { mapItems, baseItems } = schemaImport;

import type {
  MapItemWithId,
} from "~/lib/domains/mapping/_objects/map-item";
import type { Direction } from "~/lib/domains/mapping/utils/hex-coordinates";
import type { DbMapItemWithBase } from "~/lib/domains/mapping/infrastructure/map-item/types";
import { mapJoinedDbToDomain, pathToString } from "~/lib/domains/mapping/infrastructure/map-item/mappers";

export class ReadQueries {
  constructor(private db: PostgresJsDatabase<typeof schemaImport>) {}

  async fetchItemWithBase(id: number): Promise<DbMapItemWithBase> {
    const result = await this.db
      .select()
      .from(mapItems)
      .leftJoin(baseItems, eq(mapItems.refItemId, baseItems.id))
      .where(eq(mapItems.id, id))
      .limit(1);

    if (!result[0]?.map_items || !result[0]?.base_items) {
      throw new Error(`MapItem with id ${id} not found or baseItem missing.`);
    }

    return result[0] as DbMapItemWithBase;
  }

  async fetchNeighbors(parentId: number): Promise<MapItemWithId[]> {
    const neighborResults = await this.db
      .select()
      .from(mapItems)
      .leftJoin(baseItems, eq(mapItems.refItemId, baseItems.id))
      .where(eq(mapItems.parentId, parentId));

    return neighborResults
      .filter((r) => r.map_items && r.base_items)
      .map((r) => mapJoinedDbToDomain(r as DbMapItemWithBase));
  }

  async findItemIdByCoords(coords: {
    userId: number;
    groupId: number;
    path: Direction[];
  }): Promise<number | undefined> {
    const { userId, groupId, path } = coords;
    const pathString = pathToString(path);

    const whereClauses: SQL[] = [
      eq(mapItems.coord_user_id, userId),
      eq(mapItems.coord_group_id, groupId),
      eq(mapItems.path, pathString),
    ];

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
  ): Promise<DbMapItemWithBase[]> {
    const results = await this.db
      .select()
      .from(mapItems)
      .leftJoin(baseItems, eq(mapItems.refItemId, baseItems.id))
      .where(inArray(mapItems.id, ids))
      .orderBy(mapItems.id)
      .limit(limit)
      .offset(offset);

    return results.filter(
      (r) => r.map_items && r.base_items,
    ) as DbMapItemWithBase[];
  }

  async fetchMany({
    limit = 50,
    offset = 0,
  }: {
    limit?: number;
    offset?: number;
  }): Promise<DbMapItemWithBase[]> {
    const results = await this.db
      .select()
      .from(mapItems)
      .leftJoin(baseItems, eq(mapItems.refItemId, baseItems.id))
      .orderBy(mapItems.id)
      .limit(limit)
      .offset(offset);

    return results.filter(
      (r) => r.map_items && r.base_items,
    ) as DbMapItemWithBase[];
  }
}
