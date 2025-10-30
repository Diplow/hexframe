import { eq, and } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { schema as schemaImport } from "~/server/db";
const { mapItems } = schemaImport;

import type {
  MapItemIdr,
  Attrs,
} from "~/lib/domains/mapping/_objects/map-item";
import type { CreateMapItemDbAttrs, UpdateMapItemDbAttrs } from "~/lib/domains/mapping/infrastructure/map-item/types";
import { pathToString } from "~/lib/domains/mapping/infrastructure/map-item/mappers";

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
}
