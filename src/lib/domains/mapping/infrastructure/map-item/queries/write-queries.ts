import { eq, and, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { schema as schemaImport } from "~/server/db";
const { mapItems } = schemaImport;

import type {
  MapItemIdr,
  Attrs,
  Visibility,
  MapItemType,
} from "~/lib/domains/mapping/_objects/map-item";
import type { CreateMapItemDbAttrs, UpdateMapItemDbAttrs } from "~/lib/domains/mapping/infrastructure/map-item/types";
import { pathToString } from "~/lib/domains/mapping/infrastructure/map-item/mappers";
import type { Coord } from "~/lib/domains/mapping/utils";

export class WriteQueries {
  constructor(private db: PostgresJsDatabase<typeof schemaImport>) {}

  async createMapItem(attrs: CreateMapItemDbAttrs): Promise<{ id: number }> {
    const newDbItemArr = await this.db
      .insert(mapItems)
      .values(attrs)
      .returning();

    if (newDbItemArr.length === 0 || !newDbItemArr[0]) {
      throw new Error("Failed to create MapItem in DB.");
    }

    return { id: newDbItemArr[0].id };
  }

  async createManyMapItems(
    attrsArray: CreateMapItemDbAttrs[]
  ): Promise<Array<{ id: number }>> {
    if (attrsArray.length === 0) {
      return [];
    }

    const newDbItems = await this.db
      .insert(mapItems)
      .values(attrsArray)
      .returning();

    if (newDbItems.length !== attrsArray.length) {
      throw new Error(
        `Failed to create all MapItems. Expected ${attrsArray.length}, got ${newDbItems.length}`
      );
    }

    return newDbItems.map((item) => ({ id: item.id }));
  }

  async updateMapItem(
    id: number,
    updateValues: UpdateMapItemDbAttrs,
  ): Promise<void> {
    if (Object.keys(updateValues).length === 0) {
      return; // Nothing to update
    }

    await this.db.update(mapItems).set(updateValues).where(eq(mapItems.id, id));
  }

  async findItemIdToUpdate(idr: MapItemIdr): Promise<number | undefined> {
    if ("id" in idr) {
      return idr.id;
    }

    if (idr.attrs?.coords) {
      const { userId, groupId, path } = idr.attrs.coords;
      const pathString = pathToString(path);

      const itemToFind = await this.db
        .select({ id: mapItems.id })
        .from(mapItems)
        .where(
          and(
            eq(mapItems.coord_user_id, userId),
            eq(mapItems.coord_group_id, groupId),
            eq(mapItems.path, pathString),
          ),
        )
        .limit(1);

      return itemToFind[0]?.id;
    }

    throw new Error("Invalid MapItemIdr for update operation");
  }

  buildUpdateValues(attrs: Partial<Attrs>): UpdateMapItemDbAttrs {
    const updateValues: UpdateMapItemDbAttrs = {};

    if (attrs.coords) {
      updateValues.coord_user_id = attrs.coords.userId;
      updateValues.coord_group_id = attrs.coords.groupId;
      updateValues.path = pathToString(attrs.coords.path);
    }

    if (attrs.parentId !== undefined) {
      updateValues.parentId = attrs.parentId;
    }

    if (attrs.ref?.itemId !== undefined) {
      updateValues.refItemId = attrs.ref.itemId;
    }

    return updateValues;
  }

  async deleteMapItem(id: number): Promise<boolean> {
    const result = await this.db
      .delete(mapItems)
      .where(eq(mapItems.id, id))
      .returning({ id: mapItems.id });

    return result.length > 0;
  }

  /**
   * Batch update moved item AND all its descendants in a single atomic operation.
   * Treats the moved item exactly the same as descendants - just path rewriting.
   *
   * @param movedItemId - ID of the item being moved (only used to update its parentId separately)
   * @param oldCoords - Original coordinates of the moved item
   * @param newCoords - New coordinates of the moved item
   * @param newParentId - New parent ID for the moved item
   * @returns Number of items updated
   */
  async batchUpdateItemAndDescendants(params: {
    movedItemId: number;
    oldCoords: Coord;
    newCoords: Coord;
    newParentId: number | null;
  }): Promise<number> {
    const { movedItemId, oldCoords, newCoords, newParentId } = params;
    const oldPathString = pathToString(oldCoords.path);
    const newPathString = pathToString(newCoords.path);

    // For moving from "3" to "2":
    // - Item at "3" should become "2"
    // - Item at "3,1" should become "2,1"
    // The pattern is: replace the prefix

    try {
      // Single UPDATE that handles everything uniformly
      const result = await this.db
        .update(mapItems)
        .set({
          // Uniform path transformation for all items (parent and descendants)
          path: sql`
            ${sql.raw(`'${newPathString}'`)} ||
            SUBSTRING(path FROM ${sql.raw(`${oldPathString.length + 1}`)})
          `,
          // Only update parentId for the moved item itself
          parentId: sql`
            CASE
              WHEN ${mapItems.id} = ${movedItemId} THEN ${newParentId}
              ELSE ${mapItems.parentId}
            END
          `,
          coord_user_id: newCoords.userId,
          coord_group_id: newCoords.groupId,
        })
        .where(
          and(
            eq(mapItems.coord_user_id, oldCoords.userId),
            eq(mapItems.coord_group_id, oldCoords.groupId),
            // Match items where path equals oldPath OR starts with oldPath
            sql`(${mapItems.path} = ${oldPathString} OR ${mapItems.path} LIKE ${sql.raw(`'${oldPathString},%'`)})`
          )
        )
        .returning({ id: mapItems.id });

      return result.length;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update the visibility of a map item.
   */
  async updateVisibility(itemId: number, visibility: Visibility): Promise<void> {
    await this.db
      .update(mapItems)
      .set({ visibility })
      .where(eq(mapItems.id, itemId));
  }

  /**
   * Update the item type of a map item.
   */
  async updateItemType(itemId: number, itemType: MapItemType): Promise<void> {
    await this.db
      .update(mapItems)
      .set({ item_type: itemType })
      .where(eq(mapItems.id, itemId));
  }

  /**
   * Batch update the visibility of a tile and all its descendants in a single atomic operation.
   * Descendants are identified by path prefix matching (e.g., path "1,3" includes "1,3,2", "1,3,2,4", etc.)
   *
   * @param coords - Coordinates of the root tile
   * @param visibility - New visibility value
   * @returns Number of items updated
   */
  async batchUpdateVisibilityWithDescendants(
    coords: Coord,
    visibility: Visibility,
  ): Promise<number> {
    const pathString = pathToString(coords.path);

    // For empty path (user root tile), all items under that user/group are descendants
    // For non-empty path, use prefix matching
    const pathCondition = pathString === ""
      ? sql`TRUE`  // Empty path = root tile, matches all items for this user/group
      : sql`(${mapItems.path} = ${pathString} OR ${mapItems.path} LIKE ${sql.raw(`'${pathString},%'`)})`;

    const result = await this.db
      .update(mapItems)
      .set({ visibility })
      .where(
        and(
          eq(mapItems.coord_user_id, coords.userId),
          eq(mapItems.coord_group_id, coords.groupId),
          pathCondition
        )
      )
      .returning({ id: mapItems.id });

    return result.length;
  }

  /**
   * Batch update the item type of a tile and all its STRUCTURAL descendants.
   * Only updates descendants reached via positive directions (1-6), ignoring:
   * - Hexplans (direction 0)
   * - Composition children (negative directions -1 to -6)
   *
   * This enforces the constraint that system/context tiles propagate to structural children.
   *
   * @param coords - Coordinates of the root tile
   * @param itemType - New item type value
   * @returns Number of items updated
   */
  async batchUpdateItemTypeWithStructuralDescendants(
    coords: Coord,
    itemType: MapItemType,
  ): Promise<number> {
    const pathString = pathToString(coords.path);
    const pathLen = pathString.length;

    // Match the tile itself and structural descendants
    // Structural descendants: path starts with parent path and the FIRST direction after parent is 1-6
    // Non-structural: paths where the first direction after parent is 0 (hexplan) or negative (composition)
    //
    // For path "2": matches "2", "2,3", "2,3,4", but NOT "2,0", "2,-1", "2,-1,3"
    const result = await this.db
      .update(mapItems)
      .set({ item_type: itemType })
      .where(
        and(
          eq(mapItems.coord_user_id, coords.userId),
          eq(mapItems.coord_group_id, coords.groupId),
          // Match tile itself or descendants
          pathString === ""
            ? sql`TRUE`
            : sql`(${mapItems.path} = ${pathString} OR ${mapItems.path} LIKE ${sql.raw(`'${pathString},%'`)})`,
          // Filter: tile itself OR first direction after parent is positive (1-6)
          pathString === ""
            ? sql`(${mapItems.path} = '' OR ${mapItems.path} ~ '^[1-6](,.*)?$')`
            : sql`(
                ${mapItems.path} = ${pathString}
                OR (
                  LENGTH(${mapItems.path}) > ${sql.raw(String(pathLen))}
                  AND CAST(SPLIT_PART(SUBSTRING(${mapItems.path} FROM ${sql.raw(String(pathLen + 2))}), ',', 1) AS INTEGER) > 0
                )
              )`
        )
      )
      .returning({ id: mapItems.id });

    return result.length;
  }
}
