import { useMemo, useRef, useCallback } from "react";
import type { Dispatch } from "react";
import { api } from "~/commons/trpc/react";
import type { CacheState, CacheAction } from "~/app/map/Cache/State";
import type { MutationOperations, DataOperations } from "~/app/map/Cache/types/handlers";
import type { StorageService } from "~/app/map/Cache/Services/types";
import { MutationCoordinator } from "~/app/map/Cache/_coordinators/mutation-coordinator";
import type { Coord } from "~/lib/domains/mapping/utils";
import type { EventBusService } from '~/app/map';

interface MutationOperationsConfig {
  dispatch: Dispatch<CacheAction>;
  state: CacheState;
  dataOperations: DataOperations;
  storageService: StorageService;
  eventBus?: EventBusService;
  mapContext?: {
    userId: number;
    groupId: number;
    rootItemId: number;
  };
}

/**
 * Hook that creates mutation operations using the MutationCoordinator
 */
export function useMutationOperations(config: MutationOperationsConfig): MutationOperations {
  // Initialize tRPC mutation hooks
  const addItemMutation = api.map.addItem.useMutation();
  const updateItemMutation = api.map.updateItem.useMutation();
  const deleteItemMutation = api.map.removeItem.useMutation();
  const moveItemMutation = api.map.items.moveMapItem.useMutation();
  
  // Use ref to provide current state to coordinator
  const stateRef = useRef(config.state);
  stateRef.current = config.state;
  const getState = useCallback(() => ({ itemsById: stateRef.current.itemsById }), []);
  
  // Wrap mutations to match expected interface
  const wrappedAddItemMutation = useMemo(() => ({
    mutateAsync: async (params: { coords: Coord; parentId?: number | null; title?: string; descr?: string; url?: string }) => {
      return addItemMutation.mutateAsync({
        parentId: params.parentId,
        coords: params.coords,
        title: params.title,
        descr: params.descr,
        url: params.url,
      });
    },
  }), [addItemMutation]);

  const wrappedUpdateItemMutation = useMemo(() => ({
    mutateAsync: async (params: { coords: Coord; title?: string; descr?: string; url?: string }) => {
      return updateItemMutation.mutateAsync({
        coords: params.coords,
        data: {
          title: params.title,
          descr: params.descr,
          url: params.url,
        },
      });
    },
  }), [updateItemMutation]);

  const wrappedDeleteItemMutation = useMemo(() => ({
    mutateAsync: async (params: { coords: Coord }) => {
      await deleteItemMutation.mutateAsync(params);
      return { success: true as const };
    },
  }), [deleteItemMutation]);

  const wrappedMoveItemMutation = useMemo(() => ({
    mutateAsync: async (params: { oldCoords: Coord; newCoords: Coord }) => {
      return moveItemMutation.mutateAsync(params);
    },
  }), [moveItemMutation]);

  // Create coordinator instance
  const coordinator = useMemo(() => {
    return new MutationCoordinator({
      dispatch: config.dispatch,
      getState,
      dataOperations: config.dataOperations,
      storageService: config.storageService,
      mapContext: config.mapContext,
      eventBus: config.eventBus,
      addItemMutation: wrappedAddItemMutation,
      updateItemMutation: wrappedUpdateItemMutation,
      deleteItemMutation: wrappedDeleteItemMutation,
      moveItemMutation: wrappedMoveItemMutation,
    });
  }, [
    config.dispatch,
    getState,
    config.dataOperations,
    config.storageService,
    config.mapContext,
    config.eventBus,
    wrappedAddItemMutation,
    wrappedUpdateItemMutation,
    wrappedDeleteItemMutation,
    wrappedMoveItemMutation,
  ]);
  
  // Return operations interface
  return useMemo(() => ({
    createItem: coordinator.createItem.bind(coordinator),
    updateItem: coordinator.updateItem.bind(coordinator),
    deleteItem: coordinator.deleteItem.bind(coordinator),
    moveItem: coordinator.moveItem.bind(coordinator),
    rollbackOptimisticChange: coordinator.rollbackChange.bind(coordinator),
    rollbackAllOptimistic: coordinator.rollbackAll.bind(coordinator),
    getPendingOptimisticChanges: coordinator.getPendingChanges.bind(coordinator),
  }), [coordinator]);
}