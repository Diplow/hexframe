import type {
  MapItemRepository,
  BaseItemRepository,
} from "~/lib/domains/mapping/_repositories";
import { MapItemActions } from "~/lib/domains/mapping/_actions";
import { adapt } from "~/lib/domains/mapping/types/contracts";
import { CoordSystem } from "~/lib/domains/mapping/utils/hex-coordinates";
import { MapItemType } from "~/lib/domains/mapping/_objects";
import type { MapContract } from "~/lib/domains/mapping/types/contracts";
import { MappingUtils } from "~/lib/domains/mapping/services";

export class MapManagementService {
  private readonly actions: MapItemActions;

  constructor(repositories: {
    mapItem: MapItemRepository;
    baseItem: BaseItemRepository;
  }) {
    this.actions = new MapItemActions({
      mapItem: repositories.mapItem,
      baseItem: repositories.baseItem,
    });
  }

  /**
   * Fetches the root USER MapItem for a given user/group and its entire tree of descendants.
   * This represents what was previously a "map".
   */
  async getMapData({
    userId,
    groupId = 0,
  }: {
    userId: number;
    groupId?: number;
  }): Promise<MapContract | null> {
    const rootItem = await this.actions.mapItems.getRootItem(userId, groupId);
    if (!rootItem) {
      throw new Error(`Map for user ${userId}, group ${groupId} not found.`);
    }
    const descendants = await this.actions.getDescendants(rootItem.id);
    return adapt.map(rootItem, descendants);
  }

  /**
   * Fetches all root USER MapItems for a given user (across all their groups).
   */
  async getManyUserMaps(
    userId: number,
    limit?: number,
    offset?: number,
  ): Promise<MapContract[]> {
    const params = MappingUtils.validatePaginationParameters(limit, offset);
    const rootItems = await this.actions.mapItems.getRootItemsForUser(
      userId,
      params.limit,
      params.offset,
    );
    const mapContracts = await Promise.all(
      rootItems.map(async (root) => {
        const descendants = await this.actions.getDescendants(root.id);
        return adapt.map(root, descendants);
      }),
    );
    return mapContracts;
  }

  /**
   * Creates a new root USER MapItem.
   */
  async createMap({
    userId,
    groupId = 0,
    title,
    descr,
  }: {
    userId: number;
    groupId?: number;
    title?: string;
    descr?: string;
  }): Promise<MapContract> {
    const rootCoords = CoordSystem.getCenterCoord(userId, groupId);
    const rootItem = await this.actions.createMapItem({
      itemType: MapItemType.USER,
      coords: rootCoords,
      title,
      descr,
    });
    return adapt.map(rootItem, []);
  }

  /**
   * Updates the BaseItem (title, description) of a root USER MapItem.
   */
  async updateMapInfo({
    userId,
    groupId = 0,
    title,
    descr,
  }: {
    userId: number;
    groupId?: number;
    title?: string;
    descr?: string;
  }): Promise<MapContract | null> {
    const rootItem = await this.actions.mapItems.getRootItem(userId, groupId);
    if (!rootItem) {
      throw new Error(
        `Map for user ${userId}, group ${groupId} not found for update.`,
      );
    }
    if (rootItem.attrs.itemType !== MapItemType.USER) {
      throw new Error("Cannot update map info for a non-root item.");
    }

    await this.actions.updateRef(rootItem.ref, { title, descr });
    const updatedRootItem = await this.actions.mapItems.getOne(rootItem.id);
    const descendants = await this.actions.getDescendants(updatedRootItem.id);
    return adapt.map(updatedRootItem, descendants);
  }

  /**
   * Removes a root USER MapItem and all its descendants.
   */
  async removeMap({
    userId,
    groupId = 0,
  }: {
    userId: number;
    groupId?: number;
  }): Promise<void> {
    const rootItem = await this.actions.mapItems.getRootItem(userId, groupId);
    if (!rootItem) {
      console.warn(
        `Map for user ${userId}, group ${groupId} not found for removal.`,
      );
      return;
    }
    if (rootItem.attrs.itemType !== MapItemType.USER) {
      throw new Error("Attempted to remove a non-root item as a map.");
    }
    await this.actions.removeItem({ idr: { id: rootItem.id } });
  }
}
