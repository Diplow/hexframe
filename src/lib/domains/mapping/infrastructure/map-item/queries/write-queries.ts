import { eq, and, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { schema as schemaImport } from "~/server/db";
const { mapItems } = schemaImport;

import type {
  MapItemIdr,
  Attrs,
  Visibility,
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
}
