import { eq, inArray, asc, desc } from "drizzle-orm";

import {
  type Attrs,
  type BaseItemIdr,
  type BaseItemWithId,
  type RelatedItems,
  type RelatedLists,
  BaseItem,
} from "~/lib/domains/mapping/_objects/base-item";
import type { BaseItemRepository } from "~/lib/domains/mapping/_repositories";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { schema as schemaImport } from "~/server/db";

// Infer DB type
type DbBaseItemSelect = typeof schemaImport.baseItems.$inferSelect;

// Mapping function DB -> Domain
function mapDbToDomain(dbItem: DbBaseItemSelect): BaseItemWithId {
  // BaseItem is simple, no complex relations to map in this basic version
  const item = new BaseItem({
    id: dbItem.id,
    attrs: {
      title: dbItem.title,
      content: dbItem.content,
      preview: dbItem.preview ?? undefined,
      link: dbItem.link ?? "",
    },
    // History/RelatedItems/RelatedLists are not loaded/mapped here
  });
  return item as BaseItemWithId;
}

export class DbBaseItemRepository implements BaseItemRepository {
  private db: PostgresJsDatabase<typeof schemaImport>;

  constructor(db: PostgresJsDatabase<typeof schemaImport>) {
    this.db = db;
  }

  /**
   * Create a new repository instance that uses the given transaction
   */
  withTransaction(tx: PostgresJsDatabase<typeof schemaImport>): DbBaseItemRepository {
    return new DbBaseItemRepository(tx);
  }

  public handleCascading(): boolean {
    return true;
  }

  // Basic Get by ID
  async getOne(id: number): Promise<BaseItemWithId> {
    const result = await this.db.query.baseItems.findFirst({
      where: eq(schemaImport.baseItems.id, id),
    });
    if (!result) {
      throw new Error(`BaseItem with id ${id} not found`);
    }
    return mapDbToDomain(result);
  }

  // Get by Identifier (only supports numeric ID for BaseItem)
  async getOneByIdr({
    idr,
  }: {
    idr: BaseItemIdr;
    limit?: number;
    offset?: number;
  }): Promise<BaseItemWithId> {
    if ("id" in idr) {
      return this.getOne(idr.id);
    }
    // BaseItemIdr doesn't have other unique identifiers in its definition
    throw new Error(
      "Invalid BaseItemIdr provided, only { id: number } is supported",
    );
  }

  // Basic Get Many (pagination)
  async getMany({
    limit = 50,
    offset = 0,
  }: {
    limit?: number;
    offset?: number;
  }): Promise<BaseItemWithId[]> {
    const results = await this.db.query.baseItems.findMany({
      limit: limit,
      offset: offset,
      orderBy: asc(schemaImport.baseItems.id),
    });
    return results.map(mapDbToDomain);
  }

  // Get Many by ONLY Numeric Identifiers
  async getManyByIdr({
    idrs,
    limit = 50,
    offset = 0,
  }: {
    idrs: BaseItemIdr[];
    limit?: number;
    offset?: number;
  }): Promise<BaseItemWithId[]> {
    const numericIds: number[] = [];
    for (const idr of idrs) {
      if ("id" in idr) {
        numericIds.push(idr.id);
      } else {
        console.warn(
          "getManyByIdr currently only supports numeric IDs for BaseItem, complex Idr ignored:",
          idr,
        );
      }
    }

    if (numericIds.length === 0) {
      return [];
    }

    const results = await this.db.query.baseItems.findMany({
      where: inArray(schemaImport.baseItems.id, numericIds),
      limit: limit,
      offset: offset,
      orderBy: asc(schemaImport.baseItems.id),
    });

    return results.map(mapDbToDomain);
  }

  // Create
  async create({
    attrs,
    // relatedItems and relatedLists are part of the interface but not used
    // for BaseItem creation as it has no direct relations in attrs
  }: {
    attrs: Attrs; // Use direct type name
    relatedItems: RelatedItems; // Use direct type name
    relatedLists: RelatedLists; // Use direct type name
  }): Promise<BaseItemWithId> {
    const [newItem] = await this.db
      .insert(schemaImport.baseItems)
      .values({
        title: attrs.title,
        content: attrs.content,
        preview: attrs.preview ?? null,
        link: attrs.link ?? null,
        // createdAt/updatedAt handled by DB default
      })
      .returning({ id: schemaImport.baseItems.id });

    if (!newItem) {
      throw new Error("Failed to create base item");
    }

    // Create initial version (version 1)
    await this._createVersion(newItem.id, attrs);

    return this.getOne(newItem.id); // Fetch after create
  }

  // Update via Aggregate
  async update({
    aggregate,
    attrs,
  }: {
    aggregate: BaseItemWithId;
    attrs: Partial<Attrs>; // Use direct type name
  }): Promise<BaseItemWithId> {
    return this.updateByIdr({ idr: { id: aggregate.id }, attrs });
  }

  // Update via Numeric Identifier
  async updateByIdr({
    idr,
    attrs,
  }: {
    idr: BaseItemIdr;
    attrs: Partial<Attrs>; // Use direct type name
  }): Promise<BaseItemWithId> {
    if (!("id" in idr)) {
      throw new Error("Update by complex BaseItemIdr not supported");
    }
    const id = idr.id;

    const updateData: Partial<DbBaseItemSelect> = {};
    if (attrs.title !== undefined) updateData.title = attrs.title;
    if (attrs.content !== undefined) updateData.content = attrs.content;
    // Allow setting preview to null or a new value
    if (attrs.hasOwnProperty("preview")) updateData.preview = attrs.preview ?? null;
    // Allow setting link to null or a new value
    if (attrs.hasOwnProperty("link")) updateData.link = attrs.link ?? null;

    if (Object.keys(updateData).length === 0) {
      return this.getOne(id); // No changes
    }

    // Get current values BEFORE update (for version snapshot)
    const currentItem = await this.db.query.baseItems.findFirst({
      where: eq(schemaImport.baseItems.id, id),
    });

    if (!currentItem) {
      throw new Error(`BaseItem with id ${id} not found for update.`);
    }

    // Create version snapshot with OLD values
    await this._createVersion(id, {
      title: currentItem.title,
      content: currentItem.content,
      preview: currentItem.preview ?? undefined,
      link: currentItem.link ?? undefined,
    });

    // Now perform the update
    const [updatedItem] = await this.db
      .update(schemaImport.baseItems)
      .set(updateData)
      .where(eq(schemaImport.baseItems.id, id))
      .returning({ id: schemaImport.baseItems.id });

    if (!updatedItem) {
      throw new Error(`BaseItem with id ${id} not found for update.`);
    }
    const result = this.getOne(updatedItem.id); // Fetch after update
    return result;
  }

  // --- Relation Updates --- (Stubs - BaseItem has no relations defined in its types)
  async updateRelatedItem<K extends keyof RelatedItems>(args: {
    aggregate: BaseItemWithId;
    key: K;
    item: RelatedItems[K];
  }): Promise<BaseItemWithId> {
    console.warn("updateRelatedItem args - NO-OP for BaseItem:", args);
    // BaseItem has no defined related items to update this way
    return args.aggregate; // Return unchanged aggregate
  }

  async updateRelatedItemByIdr<K extends keyof RelatedItems>(args: {
    idr: BaseItemIdr;
    key: K;
    item: RelatedItems[K];
  }): Promise<BaseItemWithId> {
    console.warn("updateRelatedItemByIdr args - NO-OP for BaseItem:", args);
    if (!("id" in args.idr)) {
      throw new Error("Update by complex BaseItemIdr not supported");
    }
    // BaseItem has no defined related items to update this way
    return this.getOne(args.idr.id); // Fetch and return unchanged
  }

  async addToRelatedList<K extends keyof RelatedLists>(args: {
    aggregate: BaseItemWithId;
    key: K;
    item: RelatedLists[K] extends Array<infer ItemType> ? ItemType : never;
  }): Promise<BaseItemWithId> {
    console.warn("addToRelatedList args - NO-OP for BaseItem:", args);
    // BaseItem has no defined related lists to add to
    return args.aggregate;
  }

  async addToRelatedListByIdr<K extends keyof RelatedLists>(args: {
    idr: BaseItemIdr;
    key: K;
    item: RelatedLists[K] extends Array<infer ItemType> ? ItemType : never;
  }): Promise<BaseItemWithId> {
    console.warn("addToRelatedListByIdr args - NO-OP for BaseItem:", args);
    if (!("id" in args.idr)) {
      throw new Error("Update by complex BaseItemIdr not supported");
    }
    // BaseItem has no defined related lists to add to
    return this.getOne(args.idr.id);
  }

  async removeFromRelatedList<K extends keyof RelatedLists>(args: {
    aggregate: BaseItemWithId;
    key: K;
    itemId: number;
  }): Promise<BaseItemWithId> {
    console.warn("removeFromRelatedList args - NO-OP for BaseItem:", args);
    // BaseItem has no defined related lists to remove from
    return args.aggregate;
  }

  async removeFromRelatedListByIdr<K extends keyof RelatedLists>(args: {
    idr: BaseItemIdr;
    key: K;
    itemId: number;
  }): Promise<BaseItemWithId> {
    console.warn("removeFromRelatedListByIdr args - NO-OP for BaseItem:", args);
    if (!("id" in args.idr)) {
      throw new Error("Update by complex BaseItemIdr not supported");
    }
    // BaseItem has no defined related lists to remove from
    return this.getOne(args.idr.id);
  }

  // --- Remove ---
  async remove(id: number): Promise<void> {
    const result = await this.db
      .delete(schemaImport.baseItems)
      .where(eq(schemaImport.baseItems.id, id))
      .returning({ id: schemaImport.baseItems.id });
    if (result.length === 0) {
      console.warn(
        `BaseItem with id ${id} not found for removal, or already removed.`,
      );
    }
  }

  async removeByIdr({ idr }: { idr: BaseItemIdr }): Promise<void> {
    if (!("id" in idr)) {
      throw new Error("Remove by complex BaseItemIdr not supported");
    }
    await this.remove(idr.id);
  }

  /**
   * Create a version snapshot of a baseItem
   * @private
   */
  private async _createVersion(
    baseItemId: number,
    attrs: Partial<Attrs>
  ): Promise<void> {
    // Get the next version number
    const existingVersions = await this.db.query.baseItemVersions.findMany({
      where: eq(schemaImport.baseItemVersions.baseItemId, baseItemId),
      orderBy: desc(schemaImport.baseItemVersions.versionNumber),
      limit: 1,
    });

    const nextVersionNumber =
      existingVersions.length > 0 ? existingVersions[0]!.versionNumber + 1 : 1;

    // Insert version snapshot
    await this.db.insert(schemaImport.baseItemVersions).values({
      baseItemId,
      title: attrs.title!,
      content: attrs.content!,
      preview: attrs.preview ?? null,
      link: attrs.link && attrs.link !== "" ? attrs.link : null,
      versionNumber: nextVersionNumber,
      updatedBy: null, // Future: capture user ID
    });
  }
}
