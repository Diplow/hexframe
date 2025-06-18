import type {
  BaseItemRepository,
  MapItemRepository,
} from "~/lib/domains/mapping/_repositories";
import type {
  BaseItemAttrs,
  BaseItemWithId,
  MapItemWithId,
  MapItemType,
} from "~/lib/domains/mapping/_objects";
import type { Coord } from "~/lib/domains/mapping/utils/hex-coordinates";
import type { MapItemIdr } from "../../_repositories/map-item";
import { MapItemCreationHelpers } from "../_map-item-creation-helpers";
import { MapItemQueryHelpers } from "../_map-item-query-helpers";
import { MapItemMovementHelpers } from "../_map-item-movement-helpers";
import type { DatabaseTransaction } from "../../types/transaction";
import { MoveOrchestrator } from "./move-orchestrator";
import { ValidationStrategy } from "./validation-strategy";

export class MapItemActions {
  public readonly mapItems: MapItemRepository;
  private readonly baseItems: BaseItemRepository;
  private readonly creationHelpers: MapItemCreationHelpers;
  private readonly queryHelpers: MapItemQueryHelpers;
  private readonly movementHelpers: MapItemMovementHelpers;
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
    this.movementHelpers = new MapItemMovementHelpers(
      repositories.mapItem,
      repositories.baseItem,
    );
    this.moveOrchestrator = new MoveOrchestrator();
    this.validationStrategy = new ValidationStrategy();
  }

  public async createMapItem({
    itemType,
    coords,
    title,
    descr,
    url,
    parentId,
  }: {
    itemType: MapItemType;
    coords: Coord;
    title?: string;
    descr?: string;
    url?: string;
    parentId?: number;
  }): Promise<MapItemWithId> {
    return await this.creationHelpers.createMapItem({
      itemType,
      coords,
      title,
      descr,
      url,
      parentId,
    });
  }

  public async updateRef(ref: BaseItemWithId, attrs: Partial<BaseItemAttrs>) {
    return await this.creationHelpers.updateRef(ref, attrs);
  }

  public async removeItem({ idr }: { idr: MapItemIdr }) {
    const { item, descendants } = await this._getItemAndDescendants(idr);
    await this._removeDescendantsAndItem(descendants, item.id);
  }

  public async getMapItem({
    coords,
  }: {
    coords: Coord;
  }): Promise<MapItemWithId> {
    return await this.queryHelpers.getMapItem({ coords });
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

  public async getDescendants(parentId: number): Promise<MapItemWithId[]> {
    return await this.queryHelpers.getDescendants(parentId);
  }

  private async _getItemAndDescendants(idr: MapItemIdr) {
    let item: MapItemWithId | null = null;

    if ("id" in idr) {
      item = await this.mapItems.getOne(idr.id);
    } else if (idr.attrs?.coords) {
      item = await this.mapItems.getOneByIdr({ idr });
    } else {
      throw new Error("Invalid identifier for removeItem");
    }

    if (!item) {
      throw new Error(
        `MapItem not found with provided identifier: ${JSON.stringify(idr)}`,
      );
    }

    const descendants = await this.getDescendants(item.id);
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