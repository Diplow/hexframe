import type {
  BaseItemRepository,
  MapItemRepository,
} from "~/lib/domains/mapping/_repositories";
import type {
  BaseItemAttrs,
  BaseItemWithId,
  MapItemWithId,
} from "~/lib/domains/mapping/_objects";
import type { Coord } from "~/lib/domains/mapping/utils";
import type { MapItemIdr } from "~/lib/domains/mapping/_repositories";
import { MapItemCreationHelpers } from "~/lib/domains/mapping/_actions/_map-item-creation-helpers";
import { MapItemQueryHelpers } from "~/lib/domains/mapping/_actions/_map-item-query-helpers";
import { MapItemMovementHelpers } from "~/lib/domains/mapping/_actions/_map-item-movement-helpers";
import {
  type RequesterContext,
  SYSTEM_INTERNAL,
  type DatabaseTransaction,
  type CreateMapItemParams,
  type UpdateMapItemAttrs,
} from "~/lib/domains/mapping/types";
import { MoveOrchestrator } from "~/lib/domains/mapping/_actions/map-item-actions/move-orchestrator";
import { ValidationStrategy } from "~/lib/domains/mapping/_actions/map-item-actions/validation-strategy";

export class MapItemActions {
  public readonly mapItems: MapItemRepository;
  private readonly baseItems: BaseItemRepository;
  private readonly creationHelpers: MapItemCreationHelpers;
  private readonly queryHelpers: MapItemQueryHelpers;
  private readonly moveOrchestrator: MoveOrchestrator;
  private readonly validationStrategy: ValidationStrategy;

  constructor(repositories: {
    mapItem: MapItemRepository;
    baseItem: BaseItemRepository;
  }) {
    this.mapItems = repositories.mapItem;
    this.baseItems = repositories.baseItem;
    this.creationHelpers = new MapItemCreationHelpers(
      repositories.mapItem,
      repositories.baseItem,
    );
    this.queryHelpers = new MapItemQueryHelpers(
      repositories.mapItem,
      repositories.baseItem,
    );
    this.moveOrchestrator = new MoveOrchestrator();
    this.validationStrategy = new ValidationStrategy();
  }

  public async createMapItem(params: CreateMapItemParams): Promise<MapItemWithId> {
    return await this.creationHelpers.createMapItem({
      itemType: params.itemType,
      coords: params.coords,
      title: params.title,
      content: params.content,
      preview: params.preview,
      link: params.link,
      parentId: params.parentId,
      visibility: params.visibility,
    });
  }

  public async updateRef(ref: BaseItemWithId, attrs: UpdateMapItemAttrs) {
    // Now using canonical field names throughout
    const helperAttrs: Partial<BaseItemAttrs> = {
      title: attrs.title,
      content: attrs.content,
      preview: attrs.preview,
      link: attrs.link,
    };
    const result = await this.creationHelpers.updateRef(ref, helperAttrs);
    return result;
  }

  public async removeItem({ idr }: { idr: MapItemIdr }) {
    const { item, descendants } = await this._getItemAndDescendants(idr);
    await this._removeDescendantsAndItem(descendants, item.id);
  }

  public async getMapItem({
    coords,
    requester = SYSTEM_INTERNAL,
  }: {
    coords: Coord;
    requester?: RequesterContext;
  }): Promise<MapItemWithId> {
    return await this.queryHelpers.getMapItem({ coords, requester });
  }

  public async moveMapItem({
    oldCoords,
    newCoords,
    tx,
  }: {
    oldCoords: Coord;
    newCoords: Coord;
    tx?: DatabaseTransaction;
  }) {
    const repositories = this._getTransactionRepositories(tx);
    const helpers = this._createHelpersWithRepositories(repositories);
    
    return await this.moveOrchestrator.orchestrateMove({
      oldCoords,
      newCoords,
      repositories,
      helpers,
      validationStrategy: this.validationStrategy,
    });
  }

  public async getDescendants(
    parentId: number,
    requester: RequesterContext = SYSTEM_INTERNAL
  ): Promise<MapItemWithId[]> {
    return await this.queryHelpers.getDescendants(parentId, requester);
  }

  public async getAncestors(
    itemId: number,
    requester: RequesterContext = SYSTEM_INTERNAL
  ): Promise<MapItemWithId[]> {
    return await this.queryHelpers.getAncestors(itemId, requester);
  }

  private async _getItemAndDescendants(idr: MapItemIdr) {
    let item: MapItemWithId | null = null;

    // Use SYSTEM_INTERNAL for internal removal operations - no visibility filtering
    if ("id" in idr) {
      item = await this.mapItems.getOne(idr.id, SYSTEM_INTERNAL);
    } else if (idr.attrs?.coords) {
      item = await this.mapItems.getOneByIdr({ idr }, SYSTEM_INTERNAL);
    } else {
      throw new Error("Invalid identifier for removeItem");
    }

    if (!item) {
      throw new Error(
        `MapItem not found with provided identifier: ${JSON.stringify(idr)}`,
      );
    }

    const descendants = await this.getDescendants(item.id, SYSTEM_INTERNAL);
    return { item, descendants };
  }

  private async _removeDescendantsAndItem(
    descendants: MapItemWithId[],
    itemId: number,
  ) {
    for (const descendant of descendants.reverse()) {
      await this.mapItems.remove(descendant.id);
    }
    await this.mapItems.remove(itemId);
  }

  private _getTransactionRepositories(tx?: DatabaseTransaction) {
    const mapItems = tx && 'withTransaction' in this.mapItems 
      ? (this.mapItems as MapItemRepository & { withTransaction: (tx: DatabaseTransaction) => MapItemRepository }).withTransaction(tx)
      : this.mapItems;
    const baseItems = tx && 'withTransaction' in this.baseItems
      ? (this.baseItems as BaseItemRepository & { withTransaction: (tx: DatabaseTransaction) => BaseItemRepository }).withTransaction(tx)
      : this.baseItems;
      
    return { mapItems, baseItems };
  }

  private _createHelpersWithRepositories(repositories: {
    mapItems: MapItemRepository;
    baseItems: BaseItemRepository;
  }) {
    return {
      queryHelpers: new MapItemQueryHelpers(repositories.mapItems, repositories.baseItems),
      movementHelpers: new MapItemMovementHelpers(repositories.mapItems, repositories.baseItems),
    };
  }
}