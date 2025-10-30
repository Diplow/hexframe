import type { BaseItemWithId } from "~/lib/domains/mapping/_objects/base-item";
import type { MapItemWithId } from "~/lib/domains/mapping/_objects/map-item";
import type { Coord, Direction } from "~/lib/domains/mapping/utils";
import type { MapItemAttributes } from "~/lib/domains/mapping/utils";
import { MapItemType } from "~/lib/domains/mapping/_objects";

/**
 * Prepare BaseItems for copying by extracting their attributes and setting originId
 *
 * @param baseItems - Array of BaseItems to copy
 * @returns Array of attributes ready for bulk creation
 */
export function _prepareBaseItemsForCopy(
  baseItems: BaseItemWithId[]
): MapItemAttributes[] {
  return baseItems.map((baseItem) => ({
    title: baseItem.attrs.title,
    content: baseItem.attrs.content,
    preview: baseItem.attrs.preview,
    link: baseItem.attrs.link ?? "",
    originId: baseItem.id, // Track the original BaseItem
  }));
}

/**
 * Prepare MapItems for copying with new coordinates
 *
 * Adjusts paths relative to the destination coordinates.
 * For example, if copying [East, North] to [West], children become [West, North].
 *
 * @param mapItems - Array of MapItems to copy (including subtree)
 * @param destinationCoords - Target coordinates for the root of the copy
 * @param destinationParentId - Parent ID for the root of the copy
 * @returns Array of prepared MapItem data structures
 */
export function _prepareMapItemsForCopy(
  mapItems: MapItemWithId[],
  destinationCoords: Coord,
  destinationParentId: number
): Array<{
  coords: Coord;
  parentId: number;
  sourceRefId: number;
  sourceMapItemId: number;
}> {
  if (mapItems.length === 0) {
    return [];
  }

  // Sort by path length to process parents before children
  const sortedItems = [...mapItems].sort(
    (a, b) => a.attrs.coords.path.length - b.attrs.coords.path.length
  );

  // Find the root item (shortest path)
  const rootItem = sortedItems[0]!;
  const rootPathLength = rootItem.attrs.coords.path.length;

  // Create mapping from source MapItem ID to destination parent ID
  const sourceToDestParent = new Map<number, number>();
  sourceToDestParent.set(rootItem.id, destinationParentId);

  return sortedItems.map((mapItem, index) => {
    const sourcePath = mapItem.attrs.coords.path;
    const relativePathFromRoot = sourcePath.slice(rootPathLength);

    let newPath: Direction[];
    let newParentId: number;

    if (index === 0) {
      // This is the root of the copy
      newPath = destinationCoords.path;
      newParentId = destinationParentId;
    } else {
      // This is a child - adjust path relative to new root
      newPath = [...destinationCoords.path, ...relativePathFromRoot];

      // Find parent's new ID
      const sourceParentId = mapItem.attrs.parentId;
      newParentId = sourceToDestParent.get(sourceParentId!) ?? destinationParentId;

      // Store this mapping for children
      sourceToDestParent.set(mapItem.id, newParentId);
    }

    return {
      coords: {
        userId: destinationCoords.userId,
        groupId: destinationCoords.groupId,
        path: newPath,
      },
      parentId: newParentId,
      sourceRefId: mapItem.ref.id,
      sourceMapItemId: mapItem.id,
    };
  });
}

/**
 * Create mapping from source BaseItem IDs to copied BaseItem IDs
 *
 * @param sourceMapItems - Original MapItems
 * @param copiedBaseItems - Newly created BaseItems (with originId set)
 * @returns Map of source BaseItem ID to copied BaseItem ID
 */
export function _createCopyMapping(
  sourceMapItems: MapItemWithId[],
  copiedBaseItems: BaseItemWithId[]
): Map<number, number> {
  const mapping = new Map<number, number>();

  // Create mapping based on originId
  for (const copiedItem of copiedBaseItems) {
    if (copiedItem.attrs.originId !== undefined && copiedItem.attrs.originId !== null) {
      mapping.set(copiedItem.attrs.originId, copiedItem.id);
    }
  }

  return mapping;
}

/**
 * Build MapItem data structures with copied BaseItem references
 *
 * @param preparedMapItems - Prepared MapItem coordinates and metadata
 * @param baseItemMapping - Mapping from source to copied BaseItem IDs
 * @param copiedBaseItems - Array of copied BaseItems (needed for refs)
 * @returns Array of MapItem data ready for bulk creation
 */
export function _buildMapItemsWithCopiedRefs(
  preparedMapItems: Array<{
    coords: Coord;
    parentId: number;
    sourceRefId: number;
  }>,
  baseItemMapping: Map<number, number>,
  copiedBaseItems: BaseItemWithId[]
): Array<{
  attrs: {
    coords: Coord;
    parentId: number;
    ref: { itemType: MapItemType; itemId: number };
    itemType: MapItemType;
  };
  ref: BaseItemWithId;
}> {
  // Create a lookup map for copied BaseItems by ID
  const baseItemById = new Map<number, BaseItemWithId>();
  for (const baseItem of copiedBaseItems) {
    baseItemById.set(baseItem.id, baseItem);
  }

  return preparedMapItems.map((prepared) => {
    const copiedBaseItemId = baseItemMapping.get(prepared.sourceRefId);

    if (copiedBaseItemId === undefined) {
      throw new Error(
        `Failed to find copied BaseItem for source ref ${prepared.sourceRefId}`
      );
    }

    const copiedBaseItem = baseItemById.get(copiedBaseItemId);
    if (!copiedBaseItem) {
      throw new Error(
        `Failed to find copied BaseItem with ID ${copiedBaseItemId}`
      );
    }

    return {
      attrs: {
        coords: prepared.coords,
        parentId: prepared.parentId,
        ref: {
          itemType: MapItemType.BASE,
          itemId: copiedBaseItemId,
        },
        itemType: MapItemType.BASE,
      },
      ref: copiedBaseItem,
    };
  });
}
