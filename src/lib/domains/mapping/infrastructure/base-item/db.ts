import { eq, inArray, asc, desc, and } from "drizzle-orm";

import {
  type BaseItemAttrs as Attrs,
  type BaseItemIdr,
  type BaseItemWithId,
  type BaseItemRelatedItems as RelatedItems,
  type BaseItemRelatedLists as RelatedLists,
  BaseItem,
  type BaseItemVersion,
} from "~/lib/domains/mapping/_objects";
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
      originId: dbItem.originId ?? undefined,
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
        originId: attrs.originId ?? null,
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
    // Allow setting originId to null or a new value
    if (attrs.hasOwnProperty("originId")) updateData.originId = attrs.originId ?? null;

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

  // --- Version Query Methods ---

  async getVersionHistory(
    baseItemId: number,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<BaseItemVersion[]> {
    // Verify BaseItem exists
    await this.getOne(baseItemId);

    const limit = options?.limit;
    const offset = options?.offset ?? 0;

    const versions = await this.db.query.baseItemVersions.findMany({
      where: eq(schemaImport.baseItemVersions.baseItemId, baseItemId),
      orderBy: desc(schemaImport.baseItemVersions.versionNumber),
      limit,
      offset,
    });

    return versions.map((v) => ({
      id: v.id,
      baseItemId: v.baseItemId,
      versionNumber: v.versionNumber,
      title: v.title,
      content: v.content,
      preview: v.preview,
      link: v.link,
      createdAt: v.createdAt,
      updatedBy: v.updatedBy,
    }));
  }

  async getVersionByNumber(
    baseItemId: number,
    versionNumber: number
  ): Promise<BaseItemVersion> {
    // Verify BaseItem exists
    await this.getOne(baseItemId);

    const version = await this.db.query.baseItemVersions.findFirst({
      where: and(
        eq(schemaImport.baseItemVersions.baseItemId, baseItemId),
        eq(schemaImport.baseItemVersions.versionNumber, versionNumber)
      ),
    });

    if (!version) {
      throw new Error(
        `Version ${versionNumber} not found for BaseItem ${baseItemId}`
      );
    }

    return {
      id: version.id,
      baseItemId: version.baseItemId,
      versionNumber: version.versionNumber,
      title: version.title,
      content: version.content,
      preview: version.preview,
      link: version.link,
      createdAt: version.createdAt,
      updatedBy: version.updatedBy,
    };
  }

  async getLatestVersion(baseItemId: number): Promise<BaseItemVersion> {
    // Verify BaseItem exists
    await this.getOne(baseItemId);

    const version = await this.db.query.baseItemVersions.findFirst({
      where: eq(schemaImport.baseItemVersions.baseItemId, baseItemId),
      orderBy: desc(schemaImport.baseItemVersions.versionNumber),
    });

    if (!version) {
      throw new Error(`No versions found for BaseItem ${baseItemId}`);
    }

    return {
      id: version.id,
      baseItemId: version.baseItemId,
      versionNumber: version.versionNumber,
      title: version.title,
      content: version.content,
      preview: version.preview,
      link: version.link,
      createdAt: version.createdAt,
      updatedBy: version.updatedBy,
    };
  }

  async countVersions(baseItemId: number): Promise<number> {
    // Verify BaseItem exists
    await this.getOne(baseItemId);

    const result = await this.db
      .select({ count: schemaImport.baseItemVersions.id })
      .from(schemaImport.baseItemVersions)
      .where(eq(schemaImport.baseItemVersions.baseItemId, baseItemId));

    return result.length;
  }

  // --- Bulk Operations ---

  async createMany(attrsArray: Attrs[]): Promise<BaseItemWithId[]> {
    if (attrsArray.length === 0) {
      return [];
    }

    // Insert all base items
    const newItems = await this.db
      .insert(schemaImport.baseItems)
      .values(
        attrsArray.map((attrs) => ({
          title: attrs.title,
          content: attrs.content,
          preview: attrs.preview ?? null,
          link: attrs.link ?? null,
          originId: attrs.originId ?? null,
        }))
      )
      .returning({ id: schemaImport.baseItems.id });

    if (newItems.length !== attrsArray.length) {
      throw new Error("Failed to create all base items");
    }

    // Create initial versions for all items
    const versionPromises = newItems.map((item, index) =>
      this._createVersion(item.id, attrsArray[index]!)
    );
    await Promise.all(versionPromises);

    // Fetch and return all created items
    const createdItems = await this.getManyByIdr({
      idrs: newItems.map((item) => ({ id: item.id })),
      limit: newItems.length,
    });

    return createdItems;
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
