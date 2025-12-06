import type {
  MapItemRepository,
  BaseItemRepository,
} from "~/lib/domains/mapping/_repositories";
import { MapItemActions } from "~/lib/domains/mapping/_actions";
import { adapt } from "~/lib/domains/mapping/types/contracts";
import { CoordSystem } from "~/lib/domains/mapping/utils";
import { MapItemType } from "~/lib/domains/mapping/_objects";
import type { MapContract } from "~/lib/domains/mapping/types/contracts";
import { MappingUtils } from "~/lib/domains/mapping/services";
import { type RequesterContext, SYSTEM_INTERNAL } from "~/lib/domains/mapping/types";

export class MapManagementService {
  private readonly actions: MapItemActions;
  private readonly mapItemRepository: MapItemRepository;

  constructor(repositories: {
    mapItem: MapItemRepository;
    baseItem: BaseItemRepository;
  }) {
    this.actions = new MapItemActions({
      mapItem: repositories.mapItem,
      baseItem: repositories.baseItem,
    });
    this.mapItemRepository = repositories.mapItem;
  }

  /**
   * Fetches the root USER MapItem for a given user/group and its entire tree of descendants.
   * This represents what was previously a "map".
   *
   * @param userId - Owner of the map
   * @param groupId - Group ID (default 0)
   * @param requester - The requester context for visibility filtering
   */
  async getMapData({
    userId,
    groupId = 0,
    requester = SYSTEM_INTERNAL,
  }: {
    userId: string;
    groupId?: number;
    requester?: RequesterContext;
  }): Promise<MapContract | null> {
    const rootItem = await this.mapItemRepository.getRootItem(userId, groupId, requester);
    if (!rootItem) {
      throw new Error(`Map for user ${userId}, group ${groupId} not found.`);
    }
    const descendants = await this.mapItemRepository.getDescendantsByParent({
      parentUserId: rootItem.attrs.coords.userId,
      parentGroupId: rootItem.attrs.coords.groupId,
      parentPath: rootItem.attrs.coords.path,
      requester,
    });
    return adapt.map(rootItem, descendants);
  }

  /**
   * Fetches all root USER MapItems for a given user (across all their groups).
   *
   * @param userId - Owner of the maps
   * @param limit - Optional limit for pagination
   * @param offset - Optional offset for pagination
   * @param requester - The requester context for visibility filtering
   */
  async getManyUserMaps(
    userId: string,
    limit?: number,
    offset?: number,
    requester: RequesterContext = SYSTEM_INTERNAL,
  ): Promise<MapContract[]> {
    const params = MappingUtils.validatePaginationParameters(limit, offset);
    const rootItems = await this.mapItemRepository.getRootItemsForUser(
      userId,
      params.limit,
      params.offset,
      requester,
    );
    const mapContracts = await Promise.all(
      rootItems.map(async (root) => {
        const descendants = await this.mapItemRepository.getDescendantsByParent({
          parentUserId: root.attrs.coords.userId,
          parentGroupId: root.attrs.coords.groupId,
          parentPath: root.attrs.coords.path,
          requester,
        });
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
    content,
  }: {
    userId: string;
    groupId?: number;
    title?: string;
    content?: string;
  }): Promise<MapContract> {
    const rootCoords = CoordSystem.getCenterCoord(userId, groupId);
    const rootItem = await this.actions.createMapItem({
      itemType: MapItemType.USER,
      coords: rootCoords,
      title,
      content,
    });
    return adapt.map(rootItem, []);
  }

  /**
   * Updates the BaseItem (title, content) of a root USER MapItem.
   */
  async updateMapInfo({
    userId,
    groupId = 0,
    title,
    content,
  }: {
    userId: string;
    groupId?: number;
    title?: string;
    content?: string;
  }): Promise<MapContract | null> {
    // Use SYSTEM_INTERNAL for internal operations
    const rootItem = await this.actions.mapItems.getRootItem(userId, groupId, SYSTEM_INTERNAL);
    if (!rootItem) {
      throw new Error(
        `Map for user ${userId}, group ${groupId} not found for update.`,
      );
    }
    if (rootItem.attrs.itemType !== MapItemType.USER) {
      throw new Error("Cannot update map info for a non-root item.");
    }

    await this.actions.updateRef(rootItem.ref, { title, content });
    const updatedRootItem = await this.actions.mapItems.getOne(rootItem.id, SYSTEM_INTERNAL);
    const descendants = await this.actions.getDescendants(updatedRootItem.id, SYSTEM_INTERNAL);
    return adapt.map(updatedRootItem, descendants);
  }

  /**
   * Removes a root USER MapItem and all its descendants.
   */
  async removeMap({
    userId,
    groupId = 0,
  }: {
    userId: string;
    groupId?: number;
  }): Promise<void> {
    // Use SYSTEM_INTERNAL for internal operations
    const rootItem = await this.actions.mapItems.getRootItem(userId, groupId, SYSTEM_INTERNAL);
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
