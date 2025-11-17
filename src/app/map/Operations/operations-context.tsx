'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useEventBus } from '~/app/map/Services';
import type { PendingOperations, OperationType, CacheOperationEvent } from '~/app/map/Operations/types';

/**
 * Context value for operations tracking
 */
interface OperationsContextValue {
  pendingOperations: PendingOperations;
  isOperationPending: (coordId: string) => boolean;
  getPendingOperationType: (coordId: string) => OperationType | null;
  getTilesWithPendingOperations: () => string[];
}

const OperationsContext = createContext<OperationsContextValue | null>(null);

/**
 * Provider that tracks pending cache operations via EventBus
 *
 * This context is completely isolated from MapCache and only rerenders
 * when operation events are emitted (cache.operation.*).
 *
 * Benefits:
 * - No dependency on MapCache context
 * - Components using this won't rerender on unrelated cache state changes
 * - Only rerenders when operations start/complete
 * - Loose coupling via EventBus
 */
export function OperationsProvider({ children }: { children: React.ReactNode }) {
  const [pendingOperations, setPendingOperations] = useState<PendingOperations>({});
  const eventBus = useEventBus();

  useEffect(() => {
    // Subscribe to operation events only
    const unsubscribe = eventBus.on<CacheOperationEvent>('cache.operation.*', (event) => {
      const { coordId, operationType } = event.payload;

      if (event.type === 'cache.operation.started') {
        // Add pending operation
        setPendingOperations(prev => ({
          ...prev,
          [coordId]: operationType,
        }));
      } else if (event.type === 'cache.operation.completed') {
        // Remove completed operation
        setPendingOperations(prev => {
          const next = { ...prev };
          delete next[coordId];
          return next;
        });
      }
    });

    return unsubscribe;
  }, [eventBus]);

  // Memoize helper methods to prevent unnecessary rerenders
  const contextValue = useMemo<OperationsContextValue>(() => ({
    pendingOperations,

    isOperationPending: (coordId: string) => coordId in pendingOperations,

    getPendingOperationType: (coordId: string) => pendingOperations[coordId] ?? null,

    getTilesWithPendingOperations: () => Object.keys(pendingOperations),
  }), [pendingOperations]);

  return (
    <OperationsContext.Provider value={contextValue}>
      {children}
    </OperationsContext.Provider>
  );
}

/**
 * Hook to access pending operations state
 *
 * IMPORTANT: This hook will ONLY cause rerenders when:
 * - cache.operation.started events are emitted
 * - cache.operation.completed events are emitted
 *
 * It will NOT rerender on:
 * - MapCache state changes (items, center, expanded, etc.)
 * - Other EventBus events (auth.*, map.tile_*, chat.*, etc.)
 *
 * Validate behavior with React DevTools Profiler.
 */
export function useOperations(): OperationsContextValue {
  const context = useContext(OperationsContext);
  if (!context) {
    throw new Error('useOperations must be used within an OperationsProvider');
  }
  return context;
}

/**
 * Hook that returns only the pending operations record
 *
 * Use this when you only need the pendingOperations object,
 * not the helper methods.
 */
export function usePendingOperations(): PendingOperations {
  const { pendingOperations } = useOperations();
  return pendingOperations;
}
