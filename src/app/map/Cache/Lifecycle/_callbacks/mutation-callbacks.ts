import type { MutationOperations } from "~/app/map/Cache/types/handlers";
import { Visibility, MapItemType } from '~/lib/domains/mapping/utils';

/**
 * Convert string visibility to Visibility enum
 */
function toVisibilityEnum(visibility: "public" | "private" | undefined): Visibility | undefined {
  if (!visibility) return undefined;
  return visibility === "public" ? Visibility.PUBLIC : Visibility.PRIVATE;
}

/**
 * Convert string itemType to MapItemType enum
 */
function toItemTypeEnum(itemType: "organizational" | "context" | "system" | undefined): MapItemType.ORGANIZATIONAL | MapItemType.CONTEXT | MapItemType.SYSTEM | undefined {
  if (!itemType) return undefined;
  switch (itemType) {
    case "organizational": return MapItemType.ORGANIZATIONAL;
    case "context": return MapItemType.CONTEXT;
    case "system": return MapItemType.SYSTEM;
  }
}

/**
 * Create mutation operation callbacks with clean public API naming
 * Normalizes legacy field names to canonical domain types
 */
export function createMutationCallbacks(mutationOperations: MutationOperations) {
  const createItemOptimistic = async (coordId: string, data: {
    parentId?: number;
    title?: string;
    name?: string;
    preview?: string;
    description?: string;
    content?: string;
    url?: string;
    itemType: "organizational" | "context" | "system";
  }) => {
    // Normalize legacy field names to canonical domain names
    await mutationOperations.createItem(coordId, {
      title: data.title ?? data.name,
      content: data.description ?? data.content,
      preview: data.preview,
      link: data.url,
      itemType: data.itemType,
    });
  };

  const updateItemOptimistic = async (coordId: string, data: {
    title?: string;
    name?: string;
    preview?: string;
    description?: string;
    content?: string;
    url?: string;
    visibility?: "public" | "private";
    itemType?: "organizational" | "context" | "system";
  }) => {
    // Normalize legacy field names to canonical domain names
    await mutationOperations.updateItem(coordId, {
      title: data.title ?? data.name,
      content: data.description ?? data.content,
      preview: data.preview,
      link: data.url,
      visibility: toVisibilityEnum(data.visibility),
      itemType: toItemTypeEnum(data.itemType),
    });
  };

  const deleteItemOptimistic = async (coordId: string) => {
    await mutationOperations.deleteItem(coordId);
  };

  const moveItemOptimistic = async (sourceCoordId: string, targetCoordId: string) => {
    const result = await mutationOperations.moveItem(sourceCoordId, targetCoordId);
    return result;
  };

  const copyItemOptimistic = async (sourceCoordId: string, destinationCoordId: string, destinationParentId: string) => {
    const result = await mutationOperations.copyItem(sourceCoordId, destinationCoordId, destinationParentId);
    return result;
  };

  const deleteChildrenByTypeOptimistic = async (
    coordId: string,
    directionType: 'structural' | 'composed' | 'hexPlan'
  ) => {
    const result = await mutationOperations.deleteChildrenByType(coordId, directionType);
    return result;
  };

  const updateVisibilityWithDescendantsOptimistic = async (
    coordId: string,
    visibility: "public" | "private"
  ) => {
    const visibilityEnum = toVisibilityEnum(visibility)!;
    const result = await mutationOperations.updateVisibilityWithDescendants(coordId, visibilityEnum);
    return result;
  };

  return {
    createItemOptimistic,
    updateItemOptimistic,
    deleteItemOptimistic,
    deleteChildrenByTypeOptimistic,
    updateVisibilityWithDescendantsOptimistic,
    moveItemOptimistic,
    copyItemOptimistic,
    rollbackOptimisticChange: mutationOperations.rollbackOptimisticChange,
    rollbackAllOptimistic: mutationOperations.rollbackAllOptimistic,
    getPendingOptimisticChanges: mutationOperations.getPendingOptimisticChanges,

    // Operation tracking methods for preventing race conditions
    isOperationPending: mutationOperations.isOperationPending,
    getPendingOperationType: mutationOperations.getPendingOperationType,
    getTilesWithPendingOperations: mutationOperations.getTilesWithPendingOperations,
  };
}