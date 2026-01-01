
import {
  type Attrs,
  type MapItemIdr,
  type MapItemWithId,
  type RelatedItems,
  type RelatedLists,
  type Visibility,
  type MapItemType,
} from "~/lib/domains/mapping/_objects/map-item";
import {
  type Coord,
  type Direction,
} from "~/lib/domains/mapping/utils";
import type { MapItemRepository } from "~/lib/domains/mapping/_repositories";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { schema as schemaImport } from "~/server/db";
import {
  type RequesterContext,
  SYSTEM_INTERNAL,
} from "~/lib/domains/mapping/types";

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

  async getOne(id: number, requester: RequesterContext): Promise<MapItemWithId> {
    const mainItemData = await this.readQueries.fetchItemWithBase(id, requester);
    const neighbors = await this.readQueries.fetchNeighbors(
      mainItemData.map_items.id,
      requester
    );
    return mapJoinedDbToDomain(mainItemData, neighbors);
  }

  async getOneByIdr(
    { idr }: { idr: MapItemIdr },
    requester: RequesterContext
  ): Promise<MapItemWithId> {
    const mapItemId = await this._resolveItemId(idr, requester);
    if (!mapItemId) {
      throw new Error(`MapItem with idr ${JSON.stringify(idr)} not found.`);
    }
    return this.getOne(mapItemId, requester);
  }

  async exists(
    { idr }: { idr: MapItemIdr },
    requester: RequesterContext
  ): Promise<boolean> {
    const mapItemId = await this._resolveItemId(idr, requester);
    return mapItemId !== undefined;
  }

  async getMany(
    params: {
      limit?: number;
      offset?: number;
    },
    requester: RequesterContext
  ): Promise<MapItemWithId[]> {
    const results = await this.readQueries.fetchMany(params, requester);
    return results.map((r) => mapJoinedDbToDomain(r));
  }

  async getRootItem(
    userId: string,
    groupId: number,
    requester: RequesterContext
  ): Promise<MapItemWithId | null> {
    const result = await this.specializedQueries.fetchRootItem(userId, groupId, requester);
    return result ? mapJoinedDbToDomain(result, []) : null;
  }

  async getRootItemsForUser(
    userId: string,
    requester: RequesterContext,
    limit = 50,
    offset = 0
  ): Promise<MapItemWithId[]> {
    const results = await this.specializedQueries.fetchRootItemsForUser(
      userId,
      { limit, offset },
      requester
    );
    return results.map((r) => mapJoinedDbToDomain(r, []));
  }

  async getManyByIdr(
    params: {
      idrs: MapItemIdr[];
      limit?: number;
      offset?: number;
    },
    requester: RequesterContext
  ): Promise<MapItemWithId[]> {
    const numericIds = this._extractNumericIds(params.idrs);
    if (numericIds.length === 0) return [];

    const results = await this.readQueries.fetchManyByIds(numericIds, params, requester);
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
    // Use SYSTEM_INTERNAL for internal creation operations
    const result = await this.readQueries.fetchItemWithBase(newItem.id, SYSTEM_INTERNAL);
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
    // Use SYSTEM_INTERNAL for internal update operations
    return this.getOne(mapItemIdToUpdate, SYSTEM_INTERNAL);
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
      // Use SYSTEM_INTERNAL for internal removal operations
      const itemToFetch = await this.getOneByIdr({ idr }, SYSTEM_INTERNAL);
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
    parentUserId: string;
    parentGroupId: number;
    limit?: number;
    offset?: number;
    requester: RequesterContext;
  }): Promise<MapItemWithId[]> {
    const results =
      await this.specializedQueries.fetchDescendantsByParent(params);
    return results.map((r) => mapJoinedDbToDomain(r, []));
  }

  async getDescendantsWithDepth(params: {
    parentPath: Direction[];
    parentUserId: string;
    parentGroupId: number;
    maxGenerations: number;
    limit?: number;
    offset?: number;
    requester: RequesterContext;
  }): Promise<MapItemWithId[]> {
    const results =
      await this.specializedQueries.fetchDescendantsWithDepth(params);
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
    // Use SYSTEM_INTERNAL for internal relation operations
    const item = await this.getOneByIdr({ idr: args.idr }, SYSTEM_INTERNAL);
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
    // Use SYSTEM_INTERNAL for internal relation operations
    const item = await this.getOneByIdr({ idr: args.idr }, SYSTEM_INTERNAL);
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
    // Use SYSTEM_INTERNAL for internal relation operations
    const item = await this.getOneByIdr({ idr: args.idr }, SYSTEM_INTERNAL);
    return item;
  }

  private async _resolveItemId(
    idr: MapItemIdr,
    requester: RequesterContext
  ): Promise<number | undefined> {
    if ("id" in idr) {
      return idr.id;
    } else if ("attrs" in idr && idr.attrs.coords) {
      return this.readQueries.findItemIdByCoords(idr.attrs.coords, requester);
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

  async createMany(
    items: Array<{
      attrs: Attrs;
      ref: RelatedItems["ref"];
    }>
  ): Promise<MapItemWithId[]> {
    if (items.length === 0) {
      return [];
    }

    // Build DB attributes for all items
    const dbAttrsArray = items.map((item) => this._buildCreateAttrs(item.attrs));

    // Bulk insert
    const newItems = await this.writeQueries.createManyMapItems(dbAttrsArray);

    // Fetch all created items with their relations
    // Use SYSTEM_INTERNAL for internal creation operations
    const createdItems = await this.getManyByIdr({
      idrs: newItems.map((item) => ({ id: item.id })),
      limit: newItems.length,
    }, SYSTEM_INTERNAL);

    return createdItems;
  }

  private _buildCreateAttrs(attrs: Attrs) {
    return {
      parentId: attrs.parentId,
      coord_user_id: attrs.coords.userId,
      coord_group_id: attrs.coords.groupId,
      path: pathToString(attrs.coords.path),
      item_type: attrs.itemType,
      visibility: attrs.visibility,
      refItemId: attrs.ref.itemId,
    };
  }

  async getContextForCenter(config: {
    centerPath: Direction[];
    userId: string;
    groupId: number;
    includeParent: boolean;
    includeComposed: boolean;
    includeChildren: boolean;
    includeGrandchildren: boolean;
    requester: RequesterContext;
  }): Promise<{
    parent: MapItemWithId | null;
    center: MapItemWithId;
    composed: MapItemWithId[];
    children: MapItemWithId[];
    grandchildren: MapItemWithId[];
    hexPlan: MapItemWithId | null;
  }> {
    const dbResults = await this.specializedQueries.fetchContextForCenter(config);

    return {
      parent: dbResults.parent ? mapJoinedDbToDomain(dbResults.parent, []) : null,
      center: mapJoinedDbToDomain(dbResults.center, []),
      composed: dbResults.composed.map((item) => mapJoinedDbToDomain(item, [])),
      children: dbResults.children.map((item) => mapJoinedDbToDomain(item, [])),
      grandchildren: dbResults.grandchildren.map((item) => mapJoinedDbToDomain(item, [])),
      hexPlan: dbResults.hexPlan ? mapJoinedDbToDomain(dbResults.hexPlan, []) : null,
    };
  }

  /**
   * Batch update moved item AND all its descendants in a single atomic operation.
   * This is the preferred method as it avoids conflicts from two-step updates.
   */
  async batchUpdateItemAndDescendants(params: {
    movedItemId: number;
    oldCoords: Coord;
    newCoords: Coord;
    newParentId: number | null;
  }): Promise<number> {
    return this.writeQueries.batchUpdateItemAndDescendants(params);
  }

  /**
   * Update the visibility of a map item.
   */
  async updateVisibility(itemId: number, visibility: Visibility): Promise<MapItemWithId> {
    await this.writeQueries.updateVisibility(itemId, visibility);
    // Use SYSTEM_INTERNAL for internal visibility update operations
    return this.getOne(itemId, SYSTEM_INTERNAL);
  }

  /**
   * Update the item type of a map item.
   */
  async updateItemType(itemId: number, itemType: MapItemType): Promise<MapItemWithId> {
    await this.writeQueries.updateItemType(itemId, itemType);
    // Use SYSTEM_INTERNAL for internal itemType update operations
    return this.getOne(itemId, SYSTEM_INTERNAL);
  }

  /**
   * Batch update the visibility of a tile and all its descendants in a single atomic operation.
   * @returns Number of items updated
   */
  async batchUpdateVisibilityWithDescendants(
    coords: Coord,
    visibility: Visibility,
  ): Promise<number> {
    return this.writeQueries.batchUpdateVisibilityWithDescendants(coords, visibility);
  }
}
