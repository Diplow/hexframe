import { eq, type SQL, sql, and, like, gte, lte, or } from "drizzle-orm";
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

    // Composed tiles (if requested) - supports both negative directions (new model) and Direction.Center (legacy)
    // New model: For center at path "1", fetch "1,-1", "1,-2", etc. (negative directions)
    // Legacy model: For center at path "1", fetch "1,0,1", "1,0,2", etc. (Direction.Center container)
    if (config.includeComposed) {
      // NEW MODEL: Query for direct children with negative directions
      const negativeDirectionCondition = and(
        // Must start with center path
        centerPathString ? like(mapItems.path, `${centerPathString},%`) : sql`TRUE`,
        // Must be exactly one level deeper than center
        eq(
          sql`array_length(string_to_array(${mapItems.path}, ','), 1)`,
          centerDepth + 1
        ),
        // Last direction must be negative
        sql`CAST(
          NULLIF(
            SPLIT_PART(${mapItems.path}, ',', array_length(string_to_array(${mapItems.path}, ','), 1)),
            ''
          ) AS INTEGER
        ) < 0`
      )!;

      // LEGACY MODEL: Query for children under Direction.Center (0) container
      const composedChildrenPattern = centerPathString ? `${centerPathString},0,%` : '0,%';
      const legacyDirectionZeroCondition = and(
        like(mapItems.path, composedChildrenPattern),
        eq(
          sql`array_length(string_to_array(${mapItems.path}, ','), 1)`,
          centerDepth + 2
        )
      )!;

      // Support both models during transition
      fullContentConditions.push(
        or(negativeDirectionCondition, legacyDirectionZeroCondition)!
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
            // Exclude composed children (negative directions) and legacy composition containers (direction 0)
            sql`CAST(
              NULLIF(
                SPLIT_PART(${mapItems.path}, ',', array_length(string_to_array(${mapItems.path}, ','), 1)),
                ''
              ) AS INTEGER
            ) > 0`
          )
        );
    }

    // QUERY 3: Grandchildren (title only, NO content or preview)
    let grandchildrenResults: Array<{ map_items: unknown; base_items: unknown }> = [];
    if (config.includeGrandchildren) {
      const grandchildPattern = centerPathString ? `${centerPathString},%` : '%';

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
            // Exclude composed grandchildren (negative directions) and legacy containers (direction 0)
            sql`CAST(
              NULLIF(
                SPLIT_PART(${mapItems.path}, ',', array_length(string_to_array(${mapItems.path}, ','), 1)),
                ''
              ) AS INTEGER
            ) > 0`
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
    // Match composed children supporting both new (negative directions) and legacy (Direction.Center) models
    // New model: Direct children with negative directions (e.g., "1,-1", "1,-2")
    // Legacy model: Children under Direction.Center container (e.g., "1,0,1", "1,0,2")

    return results.filter((r) => {
      // Type guard
      if (!r.map_items || typeof r.map_items !== 'object') return false;
      if (!('path' in r.map_items) || typeof r.map_items.path !== 'string') return false;
      if (!r.base_items) return false;

      const path = r.map_items.path;
      const pathParts = path.split(',').filter(Boolean);
      const depth = pathParts.length;

      // NEW MODEL: Check if it's a direct child with negative direction
      if (depth === centerDepth + 1) {
        // Must start with center path (or be at root level if center is root)
        if (centerPathString && !path.startsWith(centerPathString)) return false;

        // Last direction must be negative
        const lastDirection = pathParts[pathParts.length - 1];
        if (!lastDirection) return false;

        const directionValue = parseInt(lastDirection, 10);
        if (directionValue < 0) return true; // Match: negative direction child
      }

      // LEGACY MODEL: Check if it's a child under Direction.Center (0) container
      if (depth === centerDepth + 2) {
        // Must match pattern: centerPath,0,X (children under the composition container)
        const composedPrefix = centerPathString ? `${centerPathString},0,` : '0,';
        if (path.startsWith(composedPrefix)) return true; // Match: legacy Direction.Center child
      }

      return false;
    }) as DbMapItemWithBase[];
  }

}
