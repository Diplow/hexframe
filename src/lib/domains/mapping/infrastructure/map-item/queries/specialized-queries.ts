import { eq, type SQL, sql, and, like, gte, lte, notLike, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { schema as schemaImport } from "~/server/db";
const { mapItems, baseItems } = schemaImport;

import { MapItemType } from "~/lib/domains/mapping/_objects/map-item";
import type { Direction } from "~/lib/domains/mapping/utils";
import type { DbMapItemWithBase } from "~/lib/domains/mapping/infrastructure/map-item/types";
import { pathToString } from "~/lib/domains/mapping/infrastructure/map-item/mappers";

/**
 * Field selection configuration for optimized queries
 */
export type FieldSelection = 'minimal' | 'standard' | 'full';

export interface ContextQueryConfig {
  centerPath: Direction[];
  userId: number;
  groupId: number;
  includeParent: boolean;
  includeComposed: boolean;
  includeChildren: boolean;
  includeGrandchildren: boolean;
}

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
    // maxElements should be parentCount + maxGenerations to get exact generations
    const maxElements = parentCount + maxGenerations;

    conditions.push(gte(sql`array_length(string_to_array(${mapItems.path}, ','), 1)`, minElements));

    if (maxGenerations > 0) {
      conditions.push(lte(sql`array_length(string_to_array(${mapItems.path}, ','), 1)`, maxElements));
    }

    if (parentPathString !== "") {
      conditions.push(like(mapItems.path, `${parentPathString},%`));
    }

    return conditions;
  }

  /**
   * Optimized context fetch with per-level field selection
   * Uses 3 queries to minimize data transfer:
   * - Query 1: Center/Parent/Composed with full content (AI needs it)
   * - Query 2: Children with title+preview only (overview)
   * - Query 3: Grandchildren with title only (structure awareness)
   */
  async fetchContextForCenter(
    config: ContextQueryConfig
  ): Promise<{
    parent: DbMapItemWithBase | null;
    center: DbMapItemWithBase;
    composed: DbMapItemWithBase[];
    children: DbMapItemWithBase[];
    grandchildren: DbMapItemWithBase[];
  }> {
    const { centerPath, userId, groupId } = config;
    const centerPathString = pathToString(centerPath);
    const centerDepth = centerPath.length;

    // QUERY 1: Center + Parent + Composed (FULL content - needed for AI)
    const fullContentConditions: SQL[] = [];

    // Always fetch center
    fullContentConditions.push(eq(mapItems.path, centerPathString));

    // Parent (if requested and not root)
    if (config.includeParent && centerPath.length > 0) {
      const parentPath = centerPath.slice(0, -1);
      const parentPathString = pathToString(parentPath);
      fullContentConditions.push(eq(mapItems.path, parentPathString));
    }

    // Composed tiles (if requested) - only the children under the container, not the container itself
    // For center at path "1", fetch "1,0,1", "1,0,2", etc. (NOT "1,0" which is just a transition)
    if (config.includeComposed) {
      const composedChildrenPattern = centerPathString ? `${centerPathString},0,%` : '0,%';
      fullContentConditions.push(
        and(
          like(mapItems.path, composedChildrenPattern),
          eq(
            sql`array_length(string_to_array(${mapItems.path}, ','), 1)`,
            centerDepth + 2
          )
        )!
      );
    }

    const fullContentResults = await this.db
      .select({
        map_items: {
          id: mapItems.id,
          coord_user_id: mapItems.coord_user_id,
          coord_group_id: mapItems.coord_group_id,
          path: mapItems.path,
          item_type: mapItems.item_type,
          parentId: mapItems.parentId,
          refItemId: mapItems.refItemId,
          createdAt: mapItems.createdAt,
          updatedAt: mapItems.updatedAt,
        },
        base_items: {
          id: baseItems.id,
          title: baseItems.title,
          content: baseItems.content,      // ← FULL content
          preview: baseItems.preview,
          link: baseItems.link,
          originId: baseItems.originId,
          createdAt: baseItems.createdAt,
          updatedAt: baseItems.updatedAt,
        },
      })
      .from(mapItems)
      .leftJoin(baseItems, eq(mapItems.refItemId, baseItems.id))
      .where(
        and(
          eq(mapItems.coord_user_id, userId),
          eq(mapItems.coord_group_id, groupId),
          or(...fullContentConditions)
        )
      );

    // QUERY 2: Children (title + preview, NO content)
    let childrenResults: Array<{ map_items: unknown; base_items: unknown }> = [];
    if (config.includeChildren) {
      const childPattern = centerPathString ? `${centerPathString},%` : '%';
      // Exclude composition containers: paths that end with ,0 AFTER the center path
      // For center "1,0,1", exclude "1,0,1,0" but allow "1,0,1,3"
      const composedContainerPattern = centerPathString ? `${centerPathString},0` : '0';

      childrenResults = await this.db
        .select({
          map_items: {
            id: mapItems.id,
            coord_user_id: mapItems.coord_user_id,
            coord_group_id: mapItems.coord_group_id,
            path: mapItems.path,
            item_type: mapItems.item_type,
            parentId: mapItems.parentId,
            refItemId: mapItems.refItemId,
            createdAt: mapItems.createdAt,
            updatedAt: mapItems.updatedAt,
          },
          base_items: {
            id: baseItems.id,
            title: baseItems.title,
            content: sql<string>`''`.as('content'),  // ← Empty string (don't fetch)
            preview: baseItems.preview,
            link: baseItems.link,
            originId: baseItems.originId,
            createdAt: baseItems.createdAt,
            updatedAt: baseItems.updatedAt,
          },
        })
        .from(mapItems)
        .leftJoin(baseItems, eq(mapItems.refItemId, baseItems.id))
        .where(
          and(
            eq(mapItems.coord_user_id, userId),
            eq(mapItems.coord_group_id, groupId),
            like(mapItems.path, childPattern),
            eq(
              sql`array_length(string_to_array(${mapItems.path}, ','), 1)`,
              centerDepth + 1
            ),
            // Exclude the composition container (e.g., "1,0,1,0" when center is "1,0,1")
            notLike(mapItems.path, composedContainerPattern)
          )
        );
    }

    // QUERY 3: Grandchildren (title only, NO content or preview)
    let grandchildrenResults: Array<{ map_items: unknown; base_items: unknown }> = [];
    if (config.includeGrandchildren) {
      const grandchildPattern = centerPathString ? `${centerPathString},%` : '%';
      // Exclude composition-related paths at grandchild level
      // For center "1", exclude paths like "1,X,0" (where X is any child)
      // This means excluding paths that have ,0 as the LAST segment
      const compositionGrandchildPattern = centerPathString ? `${centerPathString},%,0` : '%,0';

      grandchildrenResults = await this.db
        .select({
          map_items: {
            id: mapItems.id,
            coord_user_id: mapItems.coord_user_id,
            coord_group_id: mapItems.coord_group_id,
            path: mapItems.path,
            item_type: mapItems.item_type,
            parentId: mapItems.parentId,
            refItemId: mapItems.refItemId,
            createdAt: mapItems.createdAt,
            updatedAt: mapItems.updatedAt,
          },
          base_items: {
            id: baseItems.id,
            title: baseItems.title,
            content: sql<string>`''`.as('content'),         // ← Empty
            preview: sql<string | null>`NULL`.as('preview'), // ← NULL
            link: baseItems.link,
            originId: baseItems.originId,
            createdAt: baseItems.createdAt,
            updatedAt: baseItems.updatedAt,
          },
        })
        .from(mapItems)
        .leftJoin(baseItems, eq(mapItems.refItemId, baseItems.id))
        .where(
          and(
            eq(mapItems.coord_user_id, userId),
            eq(mapItems.coord_group_id, groupId),
            like(mapItems.path, grandchildPattern),
            eq(
              sql`array_length(string_to_array(${mapItems.path}, ','), 1)`,
              centerDepth + 2
            ),
            // Exclude grandchildren that are composition containers (ending with ,0)
            notLike(mapItems.path, compositionGrandchildPattern)
          )
        );
    }

    // Extract from full content results
    const center = fullContentResults.find((r) => r.map_items.path === centerPathString);
    if (!center?.map_items || !center?.base_items) {
      throw new Error(`Center tile not found at path: ${centerPathString}`);
    }

    const parent = config.includeParent && centerPath.length > 0
      ? this._findParent(fullContentResults, centerPath)
      : null;

    const composed = config.includeComposed
      ? this._filterComposed(fullContentResults, centerPathString, centerDepth)
      : [];

    // Filter children and grandchildren from their respective queries
    const children = childrenResults.filter((r) => {
      if (!r.map_items || typeof r.map_items !== 'object') return false;
      if (!('path' in r.map_items) || typeof r.map_items.path !== 'string') return false;
      return r.base_items !== null;
    }) as DbMapItemWithBase[];

    const grandchildren = grandchildrenResults.filter((r) => {
      if (!r.map_items || typeof r.map_items !== 'object') return false;
      if (!('path' in r.map_items) || typeof r.map_items.path !== 'string') return false;
      return r.base_items !== null;
    }) as DbMapItemWithBase[];

    return {
      parent,
      center: center as DbMapItemWithBase,
      composed,
      children,
      grandchildren,
    };
  }

  private _findParent(
    results: Array<{ map_items: unknown; base_items: unknown }>,
    centerPath: Direction[]
  ): DbMapItemWithBase | null {
    const parentPath = centerPath.slice(0, -1);
    const parentPathString = pathToString(parentPath);
    const parent = results.find((r) => {
      if (!r.map_items || typeof r.map_items !== 'object') return false;
      if (!('path' in r.map_items)) return false;
      return r.map_items.path === parentPathString;
    });
    return parent?.map_items && parent?.base_items
      ? (parent as DbMapItemWithBase)
      : null;
  }

  private _filterComposed(
    results: Array<{ map_items: unknown; base_items: unknown }>,
    centerPathString: string,
    centerDepth: number
  ): DbMapItemWithBase[] {
    // Match only the actual composed children (e.g., "1,0,1", "1,0,2")
    // NOT the container itself (e.g., "1,0")
    const composedPrefix = centerPathString ? `${centerPathString},0,` : '0,';

    return results.filter((r) => {
      // Type guard
      if (!r.map_items || typeof r.map_items !== 'object') return false;
      if (!('path' in r.map_items) || typeof r.map_items.path !== 'string') return false;
      if (!r.base_items) return false;

      const path = r.map_items.path;
      // Only match children under the composition container
      if (!path.startsWith(composedPrefix)) return false;
      const depth = path.split(',').length;
      return depth === centerDepth + 2;
    }) as DbMapItemWithBase[];
  }

}
