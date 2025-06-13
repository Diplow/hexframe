import { eq, type SQL, sql, and, like, gte } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schemaImport from "~/server/db/schema";
import { mapItems, baseItems } from "~/server/db/schema";

import { MapItemType } from "~/lib/domains/mapping/_objects/map-item";
import type { Direction } from "~/lib/domains/mapping/utils/hex-coordinates";
import type { DbMapItemWithBase } from "../types";
import { pathToString } from "../mappers";

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
}
