import type { OptimisticMoveConfig } from "./types";

/**
 * Orchestrates tile move operations with optimistic updates.
 * NOTE: This is dead code - the actual move/swap logic is in MutationCoordinator.
 * Kept as a stub to avoid breaking tests that reference this module.
 */
export async function performOptimisticMove(config: OptimisticMoveConfig): Promise<void> {
  // This code path is never executed in production - actual moves go through MutationCoordinator
  console.warn('Dead code path: performOptimisticMove was called');
  config.onMoveError?.(new Error('This move handler is dead code - use MutationCoordinator'));
}

// Re-export types and utilities for external use
export type { OptimisticMoveConfig, MoveOperation } from "./types";
export { createChildrenMigrationStrategy } from "./children-migration";
export { createServerSynchronizer } from "./server-sync";