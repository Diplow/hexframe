import type {
  MapItemRepository,
  BaseItemRepository,
} from "~/lib/domains/mapping/_repositories";
import { ItemCrudService } from "~/lib/domains/mapping/services/_item-services/_item-crud.service";
import { ItemQueryService } from "~/lib/domains/mapping/services/_item-services/_item-query.service";
import { ItemHistoryService } from "~/lib/domains/mapping/services/_item-services/_item-history.service";
import type { Coord } from "~/lib/domains/mapping/utils";
import { CoordSystem } from "~/lib/domains/mapping/utils";
import type { MapItemContract } from "~/lib/domains/mapping/types/contracts";
import {
  _prepareBaseItemsForCopy,
  _prepareMapItemsForCopy,
  _createCopyMapping,
  _buildMapItemsWithCopiedRefs,
} from "~/lib/domains/mapping/_actions/_map-item-copy-helpers";

/**
 * Coordinating service for item-level operations.
 * Provides access to specialized services for CRUD, query, and history operations.
 *
 * Usage:
 * - For CRUD operations: service.crud.methodName()
 * - For query operations: service.query.methodName()
 * - For history operations: service.history.methodName()
 * - For deep copy: service.deepCopyMapItem()
 */
export class ItemManagementService {
  public readonly crud: ItemCrudService;
  public readonly query: ItemQueryService;
  public readonly history: ItemHistoryService;

  private repositories: {
    mapItem: MapItemRepository;
    baseItem: BaseItemRepository;
  };

  constructor(repositories: {
    mapItem: MapItemRepository;
    baseItem: BaseItemRepository;
  }) {
    this.repositories = repositories;
    this.crud = new ItemCrudService(repositories);
    this.query = new ItemQueryService(repositories);
    this.history = new ItemHistoryService(repositories);
  }

  /**
   * Deep copy a MapItem and its entire subtree to a new location
   *
   * Creates copies of:
   * - The source MapItem's BaseItem (with originId tracking)
   * - All descendant MapItems and their BaseItems
   * - Preserves hierarchy and relationships
   *
   * @param sourceCoords - Coordinates of the item to copy
   * @param destinationCoords - Target coordinates for the copy
   * @param destinationParentId - Parent ID for the copied item
   * @returns The copied root MapItem contract
   * @throws Error if source doesn't exist or destination already exists
   */
  async deepCopyMapItem({
    sourceCoords,
    destinationCoords,
    destinationParentId,
  }: {
    sourceCoords: Coord;
    destinationCoords: Coord;
    destinationParentId: number;
  }): Promise<MapItemContract> {
    // 1. Verify source exists
    const sourceItem = await this.repositories.mapItem.getOneByIdr({
      idr: { attrs: { coords: sourceCoords } },
    });

    // 2. Verify destination doesn't exist
    try {
      await this.repositories.mapItem.getOneByIdr({
        idr: { attrs: { coords: destinationCoords } },
      });
      throw new Error(
        `Destination coordinates ${JSON.stringify(destinationCoords)} already exist`
      );
    } catch (error) {
      // Good - destination doesn't exist
      if ((error as Error).message.includes("already exist")) {
        throw error;
      }
    }

    // 3. Get all descendants of source
    const descendants = await this.repositories.mapItem.getDescendantsByParent({
      parentPath: sourceCoords.path,
      parentUserId: sourceCoords.userId,
      parentGroupId: sourceCoords.groupId,
    });

    // Include source item + all descendants
    const allSourceItems = [sourceItem, ...descendants];

    // 4. Prepare BaseItems for copying
    const baseItemsToCopy = allSourceItems.map((mi) => mi.ref);
    const preparedBaseItems = _prepareBaseItemsForCopy(baseItemsToCopy);

    // 5. Bulk create BaseItems
    const copiedBaseItems = await this.repositories.baseItem.createMany(
      preparedBaseItems
    );

    // 6. Create mapping from source to copied BaseItem IDs
    const baseItemMapping = _createCopyMapping(allSourceItems, copiedBaseItems);

    // 7. Prepare MapItems with new coordinates
    const preparedMapItems = _prepareMapItemsForCopy(
      allSourceItems,
      destinationCoords,
      destinationParentId
    );

    // 8. Build MapItems with copied BaseItem references
    const mapItemsToCreate = _buildMapItemsWithCopiedRefs(
      preparedMapItems,
      baseItemMapping,
      copiedBaseItems
    );

    // 9. Bulk create MapItems
    const copiedMapItems = await this.repositories.mapItem.createMany(
      mapItemsToCreate
    );

    // 10. Return the root copied item as a contract
    const rootCopiedItem = copiedMapItems[0];
    if (!rootCopiedItem) {
      throw new Error("Failed to create root copy");
    }

    return {
      id: String(rootCopiedItem.id),
      ownerId: String(rootCopiedItem.attrs.coords.userId),
      coords: CoordSystem.createId(rootCopiedItem.attrs.coords),
      title: rootCopiedItem.ref.attrs.title,
      content: rootCopiedItem.ref.attrs.content,
      preview: rootCopiedItem.ref.attrs.preview,
      link: rootCopiedItem.ref.attrs.link ?? "",
      itemType: rootCopiedItem.attrs.itemType,
      depth: rootCopiedItem.attrs.coords.path.length,
      parentId: rootCopiedItem.attrs.parentId
        ? String(rootCopiedItem.attrs.parentId)
        : null,
    };
  }
}
