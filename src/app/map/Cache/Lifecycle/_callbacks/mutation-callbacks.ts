import type { MutationOperations } from "~/app/map/Cache/types/handlers";

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
  }) => {
    // Normalize legacy field names to canonical domain names
    await mutationOperations.createItem(coordId, {
      title: data.title ?? data.name,
      content: data.description ?? data.content,
      preview: data.preview,
      link: data.url,
    });
  };

  const updateItemOptimistic = async (coordId: string, data: {
    title?: string;
    name?: string;
    preview?: string;
    description?: string;
    content?: string;
    url?: string;
  }) => {
    // Normalize legacy field names to canonical domain names
    await mutationOperations.updateItem(coordId, {
      title: data.title ?? data.name,
      content: data.description ?? data.content,
      preview: data.preview,
      link: data.url,
    });
  };

  const deleteItemOptimistic = async (coordId: string) => {
    await mutationOperations.deleteItem(coordId);
  };

  const moveItemOptimistic = async (sourceCoordId: string, targetCoordId: string) => {
    const result = await mutationOperations.moveItem(sourceCoordId, targetCoordId);
    return result;
  };

  return {
    createItemOptimistic,
    updateItemOptimistic,
    deleteItemOptimistic,
    moveItemOptimistic,
    rollbackOptimisticChange: mutationOperations.rollbackOptimisticChange,
    rollbackAllOptimistic: mutationOperations.rollbackAllOptimistic,
    getPendingOptimisticChanges: mutationOperations.getPendingOptimisticChanges,

    // Operation tracking methods for preventing race conditions
    isOperationPending: mutationOperations.isOperationPending,
    getPendingOperationType: mutationOperations.getPendingOperationType,
    getTilesWithPendingOperations: mutationOperations.getTilesWithPendingOperations,
  };
}