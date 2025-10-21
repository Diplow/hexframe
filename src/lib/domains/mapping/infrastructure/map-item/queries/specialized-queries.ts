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

    // Validate maxGenerations to prevent unbounded queries
    if (maxGenerations <= 0) {
      return [];
    }

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

    // Calculate min and max element counts based on generations
    const parentCount = parentPath.length;
    const minElements = parentCount > 0 ? parentCount + 1 : 1;
    // Add +1 to maxElements to account for composition children (paths like [3,0,1] from parent [3])
    // Composition children have path length = parent + 2, but conceptually are still "1 generation" away
    const maxElements = parentCount + maxGenerations + 1;

    conditions.push(gte(sql`array_length(string_to_array(${mapItems.path}, ','), 1)`, minElements));

    if (maxGenerations > 0) {
      conditions.push(lte(sql`array_length(string_to_array(${mapItems.path}, ','), 1)`, maxElements));
    }

    if (parentPathString !== "") {
      conditions.push(like(mapItems.path, `${parentPathString},%`));
    }

    return conditions;
  }
}
