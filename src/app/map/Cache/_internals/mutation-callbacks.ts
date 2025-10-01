import type { MutationOperations } from "~/app/map/Cache/types/handlers";

/**
 * Create mutation operation callbacks with clean public API naming
 */
export function createMutationCallbacks(mutationOperations: MutationOperations) {
  const createItemOptimistic = async (coordId: string, data: {
    parentId?: number;
    title?: string;
    name?: string;
    preview?: string;
    description?: string;
    descr?: string;
    url?: string;
  }) => {
    await mutationOperations.createItem(coordId, data);
  };

  const updateItemOptimistic = async (coordId: string, data: {
    title?: string;
    name?: string;
    preview?: string;
    description?: string;
    descr?: string;
    url?: string;
  }) => {
    console.log('🟨 Mutation callbacks - updateItemOptimistic called with:', { coordId, data });
    await mutationOperations.updateItem(coordId, data);
    console.log('🟨 Mutation callbacks - updateItem completed');
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