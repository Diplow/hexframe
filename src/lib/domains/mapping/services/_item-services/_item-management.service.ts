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
import { MapItemType, type MapItemWithId, type BaseItemWithId } from "~/lib/domains/mapping/_objects";
import {
  _prepareBaseItemsForCopy,
  _prepareMapItemsForCopy,
  _createCopyMapping,
} from "~/lib/domains/mapping/_actions/_map-item-copy-helpers";
import {
  MAX_HIERARCHY_DEPTH,
  MAX_DESCENDANTS_FOR_OPERATION,
} from "~/lib/domains/mapping/constants";

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

    // 3.5. Validate hierarchy limits
    this._validateHierarchyLimits(allSourceItems, sourceCoords);

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

    // 8. Create MapItems in batches by depth level
    // This allows us to batch-insert all items at the same depth while maintaining parent dependencies
    const copiedMapItems = await this._batchCreateByDepth(
      preparedMapItems,
      baseItemMapping,
      copiedBaseItems
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
      originId: rootCopiedItem.ref.attrs.originId
        ? String(rootCopiedItem.ref.attrs.originId)
        : null,
    };
  }

  /**
   * Create MapItems in batches grouped by depth level.
   * Items at the same depth can be created in parallel since they only depend on parents.
   *
   * Strategy:
   * 1. Group items by depth
   * 2. For each depth level (starting from shallowest):
   *    a. Resolve parent IDs from previous level
   *    b. Batch insert all items at this depth
   *    c. Store ID mappings for next level
   */
  private async _batchCreateByDepth(
    preparedMapItems: Array<{
      coords: Coord;
      parentId: number | null;
      sourceParentId: number | null;
      sourceMapItemId: number;
      sourceRefId: number;
    }>,
    baseItemMapping: Map<number, number>,
    copiedBaseItems: BaseItemWithId[]
  ): Promise<MapItemWithId[]> {
    // Group items by depth
    const itemsByDepth = new Map<number, typeof preparedMapItems>();
    for (const item of preparedMapItems) {
      const depth = item.coords.path.length;
      if (!itemsByDepth.has(depth)) {
        itemsByDepth.set(depth, []);
      }
      itemsByDepth.get(depth)!.push(item);
    }

    // Sort depths to process shallowest first
    const depths = Array.from(itemsByDepth.keys()).sort((a, b) => a - b);

    const allCopiedItems: MapItemWithId[] = [];
    const sourceToNewMapItemId = new Map<number, number>();

    // Process each depth level
    for (const depth of depths) {
      const itemsAtDepth = itemsByDepth.get(depth)!;

      // Prepare batch create data
      const createDataArray = itemsAtDepth.map((prepared) => {
        // Resolve parent ID from previous level
        let finalParentId = prepared.parentId;
        if (prepared.sourceParentId !== null) {
          const resolvedParentId = sourceToNewMapItemId.get(prepared.sourceParentId);
          if (resolvedParentId !== undefined) {
            finalParentId = resolvedParentId;
          }
        }

        // Get copied BaseItem ID
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

        return {
          prepared,
          attrs: {
            coords: prepared.coords,
            parentId: finalParentId,
            ref: {
              itemType: MapItemType.BASE,
              itemId: copiedBaseItemId,
            },
            itemType: MapItemType.BASE,
          },
          ref: copiedBaseItem,
        };
      });

      // Batch create all items at this depth
      const createdItems = await this.repositories.mapItem.createMany(
        createDataArray.map(({ attrs, ref }) => ({
          attrs,
          ref,
        }))
      );

      // Store mappings for next level
      for (let i = 0; i < createDataArray.length; i++) {
        const { prepared } = createDataArray[i]!;
        const createdItem = createdItems[i]!;
        sourceToNewMapItemId.set(prepared.sourceMapItemId, createdItem.id);
        allCopiedItems.push(createdItem);
      }
    }

    return allCopiedItems;
  }

  /**
   * Validate that a hierarchy doesn't exceed safety limits.
   * Prevents memory exhaustion and timeouts on extremely large operations.
   */
  private _validateHierarchyLimits(
    items: Array<{ attrs: { coords: Coord } }>,
    rootCoords: Coord
  ): void {
    // Check total item count
    if (items.length > MAX_DESCENDANTS_FOR_OPERATION) {
      throw new Error(
        `Operation would affect ${items.length} items, which exceeds the maximum of ${MAX_DESCENDANTS_FOR_OPERATION}. ` +
        `Please break this into smaller operations or contact support for bulk operations.`
      );
    }

    // Check maximum depth
    const maxDepth = items.reduce((max, item) => {
      const depth = item.attrs.coords.path.length - rootCoords.path.length;
      return Math.max(max, depth);
    }, 0);

    if (maxDepth > MAX_HIERARCHY_DEPTH) {
      throw new Error(
        `Hierarchy depth of ${maxDepth} exceeds the maximum of ${MAX_HIERARCHY_DEPTH}. ` +
        `Please restructure your hierarchy to be shallower.`
      );
    }
  }
}
