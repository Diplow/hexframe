import { eq, type SQL, sql, and, like, gte, lte } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { schema as schemaImport } from "~/server/db";
const { mapItems, baseItems } = schemaImport;

import { MapItemType } from "~/lib/domains/mapping/_objects/map-item";
import type { Direction } from "~/lib/domains/mapping/utils";
import type { DbMapItemWithBase } from "~/lib/domains/mapping/infrastructure/map-item/types";
import { pathToString } from "~/lib/domains/mapping/infrastructure/map-item/mappers";

export class SpecializedQueries {
  constructor(private db: PostgresJsDatabase<typeof schemaImport>) {}

  async fetchRootItem(
    userId: number,
    groupId: number,
  ): Promise<DbMapItemWithBase | null> {
    const result = await this.db
      .select()
      .from(mapItems)
      .leftJoin(baseItems, eq(mapItems.refItemId, baseItems.id))
      .where(
        and(
          eq(mapItems.coord_user_id, userId),
          eq(mapItems.coord_group_id, groupId),
          eq(mapItems.item_type, MapItemType.USER),
          eq(mapItems.path, ""),
        ),
      )
      .limit(1);

    if (!result[0]?.map_items || !result[0]?.base_items) {
      return null;
    }

    return result[0] as DbMapItemWithBase;
  }

  async fetchRootItemsForUser(
    userId: number,
    { limit = 50, offset = 0 }: { limit?: number; offset?: number },
  ): Promise<DbMapItemWithBase[]> {
    const results = await this.db
      .select()
      .from(mapItems)
      .leftJoin(baseItems, eq(mapItems.refItemId, baseItems.id))
      .where(
        and(
          eq(mapItems.coord_user_id, userId),
          eq(mapItems.item_type, MapItemType.USER),
          eq(mapItems.path, ""),
        ),
      )
      .orderBy(mapItems.coord_group_id)
      .limit(limit)
      .offset(offset);

    return results.filter(
      (r) => r.map_items && r.base_items,
    ) as DbMapItemWithBase[];
  }

  async fetchDescendantsByParent(params: {
    parentPath: Direction[];
    parentUserId: number;
    parentGroupId: number;
    limit?: number;
    offset?: number;
  }): Promise<DbMapItemWithBase[]> {
    const {
      parentPath,
      parentUserId,
      parentGroupId,
      limit = 1000,
      offset = 0,
    } = params;

    const conditions = this._buildDescendantsConditions(
      parentPath,
      parentUserId,
      parentGroupId,
    );

    const results = await this.db
      .select()
      .from(mapItems)
      .leftJoin(baseItems, eq(mapItems.refItemId, baseItems.id))
      .where(and(...conditions))
      .orderBy(sql`length(${mapItems.path})`, mapItems.path, mapItems.id)
      .limit(limit)
      .offset(offset);

    return results.filter(
      (r) => r.map_items && r.base_items,
    ) as DbMapItemWithBase[];
  }

  async fetchDescendantsWithDepth(params: {
    parentPath: Direction[];
    parentUserId: number;
    parentGroupId: number;
    maxGenerations: number;
    limit?: number;
    offset?: number;
  }): Promise<DbMapItemWithBase[]> {
    const {
      parentPath,
      parentUserId,
      parentGroupId,
      maxGenerations,
      limit = 1000,
      offset = 0,
    } = params;

    const conditions = this._buildDescendantsWithDepthConditions(
      parentPath,
      parentUserId,
      parentGroupId,
      maxGenerations,
    );

    const results = await this.db
      .select()
      .from(mapItems)
      .leftJoin(baseItems, eq(mapItems.refItemId, baseItems.id))
      .where(and(...conditions))
      .orderBy(sql`length(${mapItems.path})`, mapItems.path, mapItems.id)
      .limit(limit)
      .offset(offset);

    return results.filter(
      (r) => r.map_items && r.base_items,
    ) as DbMapItemWithBase[];
  }

  private _buildDescendantsConditions(
    parentPath: Direction[],
    parentUserId: number,
    parentGroupId: number,
  ): SQL[] {
    const parentPathString = pathToString(parentPath);

    const conditions: SQL[] = [
      eq(mapItems.coord_user_id, parentUserId),
      eq(mapItems.coord_group_id, parentGroupId),
      gte(
        sql`length(${mapItems.path})`,
        parentPathString.length > 0 ? parentPathString.length + 1 : 1,
      ),
    ];

    if (parentPathString !== "") {
      conditions.push(like(mapItems.path, `${parentPathString},%`));
    }

    return conditions;
  }

  private _buildDescendantsWithDepthConditions(
    parentPath: Direction[],
    parentUserId: number,
    parentGroupId: number,
    maxGenerations: number,
  ): SQL[] {
    const parentPathString = pathToString(parentPath);

    const conditions: SQL[] = [
      eq(mapItems.coord_user_id, parentUserId),
      eq(mapItems.coord_group_id, parentGroupId),
    ];

    // Calculate min and max path lengths based on generations
    const minLength = parentPathString.length > 0 ? parentPathString.length + 1 : 1;
    const maxLength = parentPathString.length + (maxGenerations * 2); // Each generation adds 2 chars (comma + digit)

    conditions.push(gte(sql`length(${mapItems.path})`, minLength));

    if (maxGenerations > 0) {
      conditions.push(lte(sql`length(${mapItems.path})`, maxLength));
    }

    if (parentPathString !== "") {
      conditions.push(like(mapItems.path, `${parentPathString},%`));
    }

    return conditions;
  }
}
