
import {
  type Attrs,
  type MapItemIdr,
  type MapItemWithId,
  type RelatedItems,
  type RelatedLists,
} from "~/lib/domains/mapping/_objects/map-item";
import {
  type Direction,
} from "~/lib/domains/mapping/utils";
import type { MapItemRepository } from "~/lib/domains/mapping/_repositories";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { schema as schemaImport } from "~/server/db";

import { ReadQueries } from "~/lib/domains/mapping/infrastructure/map-item/queries/read-queries";
import { WriteQueries } from "~/lib/domains/mapping/infrastructure/map-item/queries/write-queries";
import { SpecializedQueries } from "~/lib/domains/mapping/infrastructure/map-item/queries/specialized-queries";
import { RelationQueries } from "~/lib/domains/mapping/infrastructure/map-item/queries/relation-queries";
import { mapJoinedDbToDomain, pathToString } from "~/lib/domains/mapping/infrastructure/map-item/mappers";

export { parsePathString } from "~/lib/domains/mapping/infrastructure/map-item/mappers";

export class DbMapItemRepository implements MapItemRepository {
  private readQueries: ReadQueries;
  private writeQueries: WriteQueries;
  private specializedQueries: SpecializedQueries;
  private relationQueries: RelationQueries;
  private db: PostgresJsDatabase<typeof schemaImport>;

  constructor(db: PostgresJsDatabase<typeof schemaImport>) {
    this.db = db;
    this.readQueries = new ReadQueries(db);
    this.writeQueries = new WriteQueries(db);
    this.specializedQueries = new SpecializedQueries(db);
    this.relationQueries = new RelationQueries();
  }

  /**
   * Create a new repository instance that uses the given transaction
   */
  withTransaction(tx: PostgresJsDatabase<typeof schemaImport>): DbMapItemRepository {
    return new DbMapItemRepository(tx);
  }

  public handleCascading(): boolean {
    return true;
  }

  async getOne(id: number): Promise<MapItemWithId> {
    const mainItemData = await this.readQueries.fetchItemWithBase(id);
    const neighbors = await this.readQueries.fetchNeighbors(
      mainItemData.map_items.id,
    );
    return mapJoinedDbToDomain(mainItemData, neighbors);
  }

  async getOneByIdr({ idr }: { idr: MapItemIdr }): Promise<MapItemWithId> {
    const mapItemId = await this._resolveItemId(idr);
    if (!mapItemId) {
      throw new Error(`MapItem with idr ${JSON.stringify(idr)} not found.`);
    }
    return this.getOne(mapItemId);
  }

  async getMany(params: {
    limit?: number;
    offset?: number;
  }): Promise<MapItemWithId[]> {
    const results = await this.readQueries.fetchMany(params);
    return results.map((r) => mapJoinedDbToDomain(r));
  }

  async getRootItem(
    userId: number,
    groupId: number,
  ): Promise<MapItemWithId | null> {
    const result = await this.specializedQueries.fetchRootItem(userId, groupId);
    return result ? mapJoinedDbToDomain(result, []) : null;
  }

  async getRootItemsForUser(
    userId: number,
    limit = 50,
    offset = 0,
  ): Promise<MapItemWithId[]> {
    const results = await this.specializedQueries.fetchRootItemsForUser(
      userId,
      { limit, offset },
    );
    return results.map((r) => mapJoinedDbToDomain(r, []));
  }

  async getManyByIdr(params: {
    idrs: MapItemIdr[];
    limit?: number;
    offset?: number;
  }): Promise<MapItemWithId[]> {
    const numericIds = this._extractNumericIds(params.idrs);
    if (numericIds.length === 0) return [];

    const results = await this.readQueries.fetchManyByIds(numericIds, params);
    return results.map((r) => mapJoinedDbToDomain(r));
  }

  async create(params: {
    attrs: Attrs;
    relatedItems: RelatedItems;
    relatedLists: RelatedLists;
  }): Promise<MapItemWithId> {
    const { attrs } = params;
    const dbAttrsToInsert = this._buildCreateAttrs(attrs);

    const newItem = await this.writeQueries.createMapItem(dbAttrsToInsert);
    const result = await this.readQueries.fetchItemWithBase(newItem.id);
    return mapJoinedDbToDomain(result, []);
  }

  async update(params: {
    aggregate: MapItemWithId;
    attrs: Partial<Attrs>;
  }): Promise<MapItemWithId> {
    return this.updateByIdr({
      idr: { id: params.aggregate.id },
      attrs: params.attrs,
    });
  }

  async updateByIdr(params: {
    idr: MapItemIdr;
    attrs: Partial<Attrs>;
  }): Promise<MapItemWithId> {
    const { idr, attrs } = params;
    const mapItemIdToUpdate = await this.writeQueries.findItemIdToUpdate(idr);

    if (!mapItemIdToUpdate) {
      throw new Error(
        `MapItem not found for update with idr: ${JSON.stringify(idr)}`,
      );
    }

    const updateValues = this.writeQueries.buildUpdateValues(attrs);
    await this.writeQueries.updateMapItem(mapItemIdToUpdate, updateValues);
    return this.getOne(mapItemIdToUpdate);
  }

  async remove(id: number): Promise<void> {
    const wasDeleted = await this.writeQueries.deleteMapItem(id);
    if (!wasDeleted) {
      console.warn(
        `MapItem with id ${id} not found for removal, or already removed.`,
      );
    }
  }

  async removeByIdr({ idr }: { idr: MapItemIdr }): Promise<void> {
    if (!("id" in idr)) {
      const itemToFetch = await this.getOneByIdr({ idr });
      if (!itemToFetch) {
        console.warn(
          `MapItem with idr ${JSON.stringify(idr)} not found for removal.`,
        );
        return;
      }
      await this.remove(itemToFetch.id);
    } else {
      await this.remove(idr.id);
    }
  }

  async getDescendantsByParent(params: {
    parentPath: Direction[];
    parentUserId: number;
    parentGroupId: number;
    limit?: number;
    offset?: number;
  }): Promise<MapItemWithId[]> {
    const results =
      await this.specializedQueries.fetchDescendantsByParent(params);
    return results.map((r) => mapJoinedDbToDomain(r, []));
  }

  // Relation methods (delegate to relation queries)
  async updateRelatedItem<K extends keyof RelatedItems>(args: {
    aggregate: MapItemWithId;
    key: K;
    item: RelatedItems[K];
  }): Promise<MapItemWithId> {
    await this.relationQueries.updateRelatedItem(args);
    return args.aggregate; // Return unchanged for now
  }

  async updateRelatedItemByIdr<K extends keyof RelatedItems>(args: {
    idr: MapItemIdr;
    key: K;
    item: RelatedItems[K];
  }): Promise<MapItemWithId> {
    await this.relationQueries.updateRelatedItemByIdr(args);
    const item = await this.getOneByIdr({ idr: args.idr });
    return item;
  }

  async addToRelatedList<K extends keyof RelatedLists>(args: {
    aggregate: MapItemWithId;
    key: K;
    item: RelatedLists[K] extends Array<infer ItemType> ? ItemType : never;
  }): Promise<MapItemWithId> {
    await this.relationQueries.addToRelatedList(args);
    return args.aggregate; // Return unchanged for now
  }

  async addToRelatedListByIdr<K extends keyof RelatedLists>(args: {
    idr: MapItemIdr;
    key: K;
    item: RelatedLists[K] extends Array<infer ItemType> ? ItemType : never;
  }): Promise<MapItemWithId> {
    await this.relationQueries.addToRelatedListByIdr(args);
    const item = await this.getOneByIdr({ idr: args.idr });
    return item;
  }

  async removeFromRelatedList<K extends keyof RelatedLists>(args: {
    aggregate: MapItemWithId;
    key: K;
    itemId: number;
  }): Promise<MapItemWithId> {
    await this.relationQueries.removeFromRelatedList(args);
    return args.aggregate; // Return unchanged for now
  }

  async removeFromRelatedListByIdr<K extends keyof RelatedLists>(args: {
    idr: MapItemIdr;
    key: K;
    itemId: number;
  }): Promise<MapItemWithId> {
    await this.relationQueries.removeFromRelatedListByIdr(args);
    const item = await this.getOneByIdr({ idr: args.idr });
    return item;
  }

  private async _resolveItemId(idr: MapItemIdr): Promise<number | undefined> {
    if ("id" in idr) {
      return idr.id;
    } else if ("attrs" in idr && idr.attrs.coords) {
      return this.readQueries.findItemIdByCoords(idr.attrs.coords);
    }
    return undefined;
  }

  private _extractNumericIds(idrs: MapItemIdr[]): number[] {
    const numericIds: number[] = [];
    for (const idr of idrs) {
      if ("id" in idr) {
        numericIds.push(idr.id);
      } else {
        console.warn(
          "getManyByIdr currently only supports numeric IDs for direct fetching, complex Idr ignored:",
          idr,
        );
      }
    }
    return numericIds;
  }

  private _buildCreateAttrs(attrs: Attrs) {
    return {
      originId: attrs.originId,
      parentId: attrs.parentId,
      coord_user_id: attrs.coords.userId,
      coord_group_id: attrs.coords.groupId,
      path: pathToString(attrs.coords.path),
      item_type: attrs.itemType,
      refItemId: attrs.ref.itemId,
    };
  }
}
