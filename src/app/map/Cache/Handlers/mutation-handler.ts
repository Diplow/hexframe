import type { CacheAction, CacheState } from "../State/types";
import { cacheActions } from "../State/actions";
import type { DataOperations } from "./types";
import { MapItemType } from "~/lib/domains/mapping/_objects/map-item";
import type { EventBusService } from "~/app/map/types/events";

// Note: Server mutations are NOT handled through the server service
// They should use tRPC mutation hooks directly for proper client-side patterns
export type MutationHandlerServices = Record<string, never>;

export interface MutationHandlerConfig {
  dispatch: React.Dispatch<CacheAction>;
  services: MutationHandlerServices;
  getState: () => CacheState;
  dataHandler: DataOperations;
  eventBus?: EventBusService;
}

export interface MutationResult {
  success: boolean;
  optimisticApplied?: boolean;
  rolledBack?: boolean;
  error?: Error;
}

export interface OptimisticChange {
  id: string;
  type: "create" | "update" | "delete";
  coordId: string;
  previousData?: unknown;
  timestamp: number;
}

export interface MutationOperations {
  createItem: (coordId: string, data: Record<string, unknown>) => Promise<MutationResult>;
  updateItem: (coordId: string, data: Record<string, unknown>) => Promise<MutationResult>;
  deleteItem: (coordId: string) => Promise<MutationResult>;
  rollbackOptimisticChange: (changeId: string) => void;
  rollbackAllOptimistic: () => void;
  getPendingOptimisticChanges: () => OptimisticChange[];
}

export function createMutationHandler(
  config: MutationHandlerConfig,
): MutationOperations {
  const { dispatch, getState, dataHandler, eventBus } = config;

  // Track optimistic changes
  const pendingChanges = new Map<string, OptimisticChange>();

  const generateChangeId = () => `change_${Date.now()}_${Math.random()}`;

  const createItem = async (
    coordId: string,
    data: Record<string, unknown>,
  ): Promise<MutationResult> => {
    try {
      // Apply optimistic update if enabled
      if (getState().cacheConfig.enableOptimisticUpdates) {
        const changeId = generateChangeId();
        const optimisticChange: OptimisticChange = {
          id: changeId,
          type: "create",
          coordId,
          timestamp: Date.now(),
        };

        pendingChanges.set(changeId, optimisticChange);

        const optimisticItem = {
          coordinates: coordId,
          name: data.name || "New Item",
          descr: data.description || "",
          url: data.url || "",
          depth: 1, // TODO: Calculate actual depth
          id: `optimistic_${changeId}`,
          parentId: null, // TODO: Determine parent
          itemType: MapItemType.BASE,
          ownerId: "current-user", // TODO: Get actual user
        };

        dispatch(cacheActions.loadRegion([optimisticItem] as Parameters<typeof cacheActions.loadRegion>[0], coordId, 1));

        // Emit event for tile creation
        if (eventBus) {
          eventBus.emit({
            type: 'map.tile_created',
            source: 'map_cache',
            payload: {
              tileId: optimisticItem.id,
              tileName: optimisticItem.name,
              coordId,
              tileData: data
            }
          });
        }

        return { success: true, optimisticApplied: true };
      }

      return { success: true, optimisticApplied: false };
    } catch (error) {
      dispatch(cacheActions.setError(error as Error));
      return {
        success: false,
        error: error as Error,
        optimisticApplied: false,
        rolledBack: false,
      };
    }
  };

  const updateItem = async (
    coordId: string,
    data: Record<string, unknown>,
  ): Promise<MutationResult> => {
    try {
      const existingItem = getState().itemsById[coordId];

      if (!existingItem) {
        // Can't optimistically update non-existent item
        return { success: true, optimisticApplied: false };
      }

      // Apply optimistic update if enabled
      if (getState().cacheConfig.enableOptimisticUpdates) {
        const changeId = generateChangeId();
        const optimisticChange: OptimisticChange = {
          id: changeId,
          type: "update",
          coordId,
          previousData: existingItem.data,
          timestamp: Date.now(),
        };

        pendingChanges.set(changeId, optimisticChange);

        // Create an optimistic update that maintains all required fields
        // We need to create a proper MapItemAPIContract for the loadRegion action
        const updatedItem = {
          id: existingItem.metadata.dbId,
          name: data.name as string ?? existingItem.data.name,
          descr: data.description as string ?? existingItem.data.description,
          url: data.url as string ?? existingItem.data.url,
          coordinates: coordId,
          depth: existingItem.metadata.depth,
          parentId: existingItem.metadata.parentId ?? null,
          itemType: MapItemType.BASE,
          ownerId: existingItem.metadata.ownerId,
        };
        
        dispatch(cacheActions.loadRegion([updatedItem], coordId, 1));

        // Emit event for tile update
        if (eventBus) {
          eventBus.emit({
            type: 'map.tile_updated',
            source: 'map_cache',
            payload: {
              tileId: existingItem.metadata.dbId,
              tileName: updatedItem.name,
              coordId,
              updates: data
            }
          });
        }

        return { success: true, optimisticApplied: true };
      }

      return { success: true, optimisticApplied: false };
    } catch (error) {
      dispatch(cacheActions.setError(error as Error));
      return {
        success: false,
        error: error as Error,
        optimisticApplied: false,
        rolledBack: false,
      };
    }
  };

  const deleteItem = async (coordId: string): Promise<MutationResult> => {
    try {
      const existingItem = getState().itemsById[coordId];

      if (!existingItem) {
        // Can't delete non-existent item
        return { success: true, optimisticApplied: false };
      }

      // Apply optimistic removal if enabled
      if (getState().cacheConfig.enableOptimisticUpdates) {
        const changeId = generateChangeId();
        const optimisticChange: OptimisticChange = {
          id: changeId,
          type: "delete",
          coordId,
          previousData: existingItem.data,
          timestamp: Date.now(),
        };

        pendingChanges.set(changeId, optimisticChange);

        // Optimistically remove by invalidating the region
        dataHandler.invalidateRegion(coordId);

        // Emit event for tile deletion
        if (eventBus) {
          console.log('[MutationHandler] 📤 Emitting map.tile_deleted event:', {
            tileId: existingItem.metadata.dbId,
            tileName: existingItem.data.name,
            coordId
          });
          eventBus.emit({
            type: 'map.tile_deleted',
            source: 'map_cache',
            payload: {
              tileId: existingItem.metadata.dbId,
              tileName: existingItem.data.name,
              coordId
            }
          });
        } else {
          console.warn('[MutationHandler] ⚠️ No eventBus available to emit tile_deleted event');
        }

        return { success: true, optimisticApplied: true };
      }

      return { success: true, optimisticApplied: false };
    } catch (error) {
      dispatch(cacheActions.setError(error as Error));
      return {
        success: false,
        error: error as Error,
        optimisticApplied: false,
        rolledBack: false,
      };
    }
  };

  const rollbackOptimisticChange = (changeId: string): void => {
    const change = pendingChanges.get(changeId);
    if (!change) return;

    try {
      switch (change.type) {
        case "update":
          if (change.previousData) {
            // Restore previous data
            const restoredItem = {
              ...change.previousData,
              coordinates: change.coordId,
            };
            dispatch(
              cacheActions.loadRegion([restoredItem] as Parameters<typeof cacheActions.loadRegion>[0], change.coordId, 1),
            );
          }
          break;
        case "create":
          // Remove the optimistically created item
          dataHandler.invalidateRegion(change.coordId);
          break;
        case "delete":
          if (change.previousData) {
            // Restore the deleted item
            const restoredItem = {
              ...change.previousData,
              coordinates: change.coordId,
            };
            dispatch(
              cacheActions.loadRegion([restoredItem] as Parameters<typeof cacheActions.loadRegion>[0], change.coordId, 1),
            );
          }
          break;
      }

      pendingChanges.delete(changeId);
    } catch (error) {
      console.error("Failed to rollback optimistic change:", error);
      dispatch(cacheActions.setError(error as Error));
    }
  };

  const rollbackAllOptimistic = (): void => {
    const changeIds = Array.from(pendingChanges.keys());
    changeIds.forEach(rollbackOptimisticChange);
  };

  const getPendingOptimisticChanges = (): OptimisticChange[] => {
    return Array.from(pendingChanges.values()).sort(
      (a, b) => a.timestamp - b.timestamp,
    );
  };

  return {
    createItem,
    updateItem,
    deleteItem,
    rollbackOptimisticChange,
    rollbackAllOptimistic,
    getPendingOptimisticChanges,
  };
}

/**
 * Creates a mutation handler for cache coordination only
 * Simplified factory function for easier testing and cleaner architecture
 */
export function createMutationHandlerForCache(
  dispatch: React.Dispatch<CacheAction>,
  getState: () => CacheState,
  dataHandler: DataOperations,
  eventBus?: EventBusService,
): MutationOperations {
  return createMutationHandler({
    dispatch,
    services: {}, // No services needed for cache-only coordination
    getState,
    dataHandler,
    eventBus,
  });
}

// Legacy factory function for backwards compatibility
// @deprecated Use createMutationHandlerForCache instead
export function createMutationHandlerWithServerService(
  dispatch: React.Dispatch<CacheAction>,
  getState: () => CacheState,
  dataHandler: DataOperations,
  _serviceConfig?: unknown, // Ignored - mutations don't use server service
) {
  console.warn(
    "createMutationHandlerWithServerService is deprecated. Use createMutationHandlerForCache instead. Mutations should use tRPC hooks directly.",
  );

  return createMutationHandlerForCache(dispatch, getState, dataHandler);
}

// Legacy factory function for backwards compatibility
// @deprecated Use createMutationHandlerForCache instead
export function createMutationHandlerWithServices(
  dispatch: React.Dispatch<CacheAction>,
  getState: () => CacheState,
  dataHandler: DataOperations,
  // Future: real mutation services will be injected here
) {
  console.warn(
    "createMutationHandlerWithServices is deprecated. Use createMutationHandlerForCache instead.",
  );

  return createMutationHandlerForCache(dispatch, getState, dataHandler);
}
