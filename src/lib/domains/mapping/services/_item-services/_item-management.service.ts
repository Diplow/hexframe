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
import { MapItemType } from "~/lib/domains/mapping/_objects";
import {
  _prepareBaseItemsForCopy,
  _prepareMapItemsForCopy,
  _createCopyMapping,
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
    const destinationExists = await this.repositories.mapItem.exists({
      idr: { attrs: { coords: destinationCoords } },
    });

    if (destinationExists) {
      throw new Error(
        `Destination coordinates ${JSON.stringify(destinationCoords)} already exist`
      );
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

    // 7. Prepare MapItems with new coordinates (with sourceParentId tracking)
    const preparedMapItems = _prepareMapItemsForCopy(
      allSourceItems,
      destinationCoords,
      destinationParentId
    );

    // 8. Create MapItems sequentially to resolve parent IDs correctly
    const copiedMapItems = [];
    const sourceToNewMapItemId = new Map<number, number>();

    // Sort by depth to ensure parents are created before children
    const sortedPrepared = [...preparedMapItems].sort(
      (a, b) => a.coords.path.length - b.coords.path.length
    );

    for (const prepared of sortedPrepared) {
      // Resolve parent ID if this is a child
      let finalParentId = prepared.parentId;
      if (prepared.sourceParentId !== null) {
        const resolvedParentId = sourceToNewMapItemId.get(prepared.sourceParentId);
        if (resolvedParentId !== undefined) {
          finalParentId = resolvedParentId;
        }
      }

      // Get the copied BaseItem ID
      const copiedBaseItemId = baseItemMapping.get(prepared.sourceRefId);
      if (copiedBaseItemId === undefined) {
        throw new Error(
          `Failed to find copied BaseItem for source ref ${prepared.sourceRefId}`
        );
      }

      const copiedBaseItem = copiedBaseItems.find(
        (item) => item.id === copiedBaseItemId
      );
      if (!copiedBaseItem) {
        throw new Error(
          `Failed to find copied BaseItem with ID ${copiedBaseItemId}`
        );
      }

      // Create MapItem with resolved parent ID
      const createdMapItem = await this.repositories.mapItem.create({
        attrs: {
          coords: prepared.coords,
          parentId: finalParentId,
          ref: {
            itemType: MapItemType.BASE,
            itemId: copiedBaseItemId,
          },
          itemType: MapItemType.BASE,
        },
        relatedItems: {
          ref: copiedBaseItem,
          parent: null, // Will be resolved by repository
        },
        relatedLists: {
          neighbors: [], // No neighbors yet
        },
      });

      copiedMapItems.push(createdMapItem);

      // Store mapping for children
      sourceToNewMapItemId.set(prepared.sourceMapItemId, createdMapItem.id);
    }

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
      originId: rootCopiedItem.ref.attrs.originId
        ? String(rootCopiedItem.ref.attrs.originId)
        : null,
    };
  }
}
