/**
 * Operations subsystem public API
 *
 * Provides isolated tracking of pending cache operations without
 * dependency on MapCache context to prevent unnecessary rerenders.
 */

export { OperationsProvider, useOperations, usePendingOperations } from '~/app/map/Operations/operations-context';
export type { PendingOperations, OperationType, CacheOperationEvent } from '~/app/map/Operations/types';
