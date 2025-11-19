/**
 * Operations tracking types
 *
 * Isolated state for tracking pending cache operations without
 * dependency on MapCache context to prevent unnecessary rerenders.
 */

import type { AppEvent } from '~/lib/utils/event-bus';

/**
 * Operation types that can be tracked
 */
export type OperationType = 'create' | 'update' | 'delete' | 'move' | 'copy' | 'swap';

/**
 * State of pending operations by coordId
 */
export type PendingOperations = Record<string, OperationType>;

/**
 * Event emitted when a cache operation starts
 */
export interface CacheOperationStartedEvent extends AppEvent {
  type: 'cache.operation.started';
  source: 'map_cache';
  payload: {
    coordId: string;
    operationType: OperationType;
    operationId: string;
  };
}

/**
 * Event emitted when a cache operation completes (success or failure)
 */
export interface CacheOperationCompletedEvent extends AppEvent {
  type: 'cache.operation.completed';
  source: 'map_cache';
  payload: {
    coordId: string;
    operationType: OperationType;
    operationId: string;
    success: boolean;
  };
}

/**
 * Union of all cache operation events
 */
export type CacheOperationEvent = CacheOperationStartedEvent | CacheOperationCompletedEvent;
