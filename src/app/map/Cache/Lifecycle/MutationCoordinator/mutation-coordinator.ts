import { type Dispatch } from "react";
import { CoordSystem, Direction, type Coord } from "~/lib/domains/mapping/utils";
import type { MapItemUpdateAttributes, MapItemCreateAttributes } from "~/lib/domains/mapping/utils";
import type { MapItemAPIContract } from "~/server/api";
import type { CacheAction } from "~/app/map/Cache/State";
import { cacheActions } from "~/app/map/Cache/State";
import type { DataOperations } from "~/app/map/Cache/types/handlers";
import type { StorageService } from "~/app/map/Cache/Services";
import type { TileData } from "~/app/map/types";
import { OptimisticChangeTracker } from "~/app/map/Cache/Lifecycle/MutationCoordinator/optimistic-tracker";
import type { EventBusService } from '~/app/map';
import { MapItemType } from "~/lib/domains/mapping/utils";

export interface MutationCoordinatorConfig {
  dispatch: Dispatch<CacheAction>;
  getState: () => { itemsById: Record<string, TileData> };
  dataOperations: DataOperations;
  storageService: StorageService;
  mapContext?: {
    userId: string;
    groupId: number;
    rootItemId: number;
  };
  // Pass mutations as dependencies
  addItemMutation: {
    mutateAsync: (params: {
      coords: Coord;
      parentId?: number | null;
    } & MapItemCreateAttributes) => Promise<MapItemAPIContract>;
  };
  updateItemMutation: {
    mutateAsync: (params: {
      coords: Coord;
    } & MapItemUpdateAttributes) => Promise<MapItemAPIContract>;
  };
  deleteItemMutation: {
    mutateAsync: (params: {
      coords: Coord;
    }) => Promise<{ success: true }>;
  };
  moveItemMutation?: {
    mutateAsync: (params: {
      oldCoords: Coord;
      newCoords: Coord;
    }) => Promise<{
      movedItemId: string;
      modifiedItems: MapItemAPIContract[];
    }>;
  };
  copyItemMutation?: {
    mutateAsync: (params: {
      sourceCoords: Coord;
      destinationCoords: Coord;
      destinationParentId: number;
    }) => Promise<MapItemAPIContract>;
  };
  removeChildrenByTypeMutation?: {
    mutateAsync: (params: {
      coords: Coord;
      directionType: 'structural' | 'composed' | 'executionHistory';
    }) => Promise<{ success: boolean; deletedCount: number }>;
  };
  eventBus?: EventBusService;
}

export interface MutationResult {
  success: boolean;
  data?: MapItemAPIContract;
}

/**
 * Coordinates optimistic updates with server mutations
 * Encapsulates the complex logic of applying optimistic changes,
 * making server calls, and handling success/failure scenarios
 */
export class MutationCoordinator {
  private tracker = new OptimisticChangeTracker();

  // Track pending operations by tile coordId to prevent race conditions
  private pendingOperations = new Map<string, {
    type: 'create' | 'update' | 'delete' | 'move' | 'copy';
    promise: Promise<unknown>;
    startTime: number;
    operationId?: string;
  }>();

  constructor(private config: MutationCoordinatorConfig) {}

  /**
   * Check if an operation is currently pending for the given tile
   */
  isOperationPending(coordId: string): boolean {
    return this.pendingOperations.has(coordId);
  }

  /**
   * Get pending operation type for a tile, if any
   */
  getPendingOperationType(coordId: string): 'create' | 'update' | 'delete' | 'move' | 'copy' | null {
    return this.pendingOperations.get(coordId)?.type ?? null;
  }

  /**
   * Get all tiles with pending operations
   */
  getTilesWithPendingOperations(): string[] {
    return Array.from(this.pendingOperations.keys());
  }

  /**
   * Register a pending operation and ensure it's cleaned up when done
   */
  private async trackOperation<T>(
    coordId: string,
    type: 'create' | 'update' | 'delete' | 'move' | 'copy',
    operation: () => Promise<T>
  ): Promise<T> {
    // Check if operation is already pending
    if (this.pendingOperations.has(coordId)) {
      throw new Error(`Operation already in progress for tile ${coordId}. Please wait for the current operation to complete.`);
    }

    const operationId = `${type}_${coordId}_${Date.now()}`;

    // Start tracking the operation
    const promise = operation();
    this.pendingOperations.set(coordId, {
      type,
      promise,
      startTime: Date.now(),
      operationId
    });

    // Emit operation started event for OperationsContext
    this.config.eventBus?.emit({
      type: 'cache.operation.started',
      source: 'map_cache',
      payload: {
        coordId,
        operationType: type,
        operationId,
      },
      timestamp: new Date(),
    });

    let success = false;
    try {
      const result = await promise;
      success = true;
      return result;
    } finally {
      // Always clean up, even if operation fails
      this.pendingOperations.delete(coordId);

      // Emit operation completed event for OperationsContext
      this.config.eventBus?.emit({
        type: 'cache.operation.completed',
        source: 'map_cache',
        payload: {
          coordId,
          operationType: type,
          operationId,
          success,
        },
        timestamp: new Date(),
      });
    }
  }

  /**
   * Track move operations that involve multiple tiles (source and target)
   */
  private async _trackMoveOperation<T>(
    sourceCoordId: string,
    targetCoordId: string,
    operation: () => Promise<T>
  ): Promise<T> {

    // Check if either tile has pending operations
    if (this.pendingOperations.has(sourceCoordId)) {
      throw new Error(`Operation already in progress for source tile ${sourceCoordId}. Please wait for the current operation to complete.`);
    }
    if (this.pendingOperations.has(targetCoordId)) {
      throw new Error(`Operation already in progress for target tile ${targetCoordId}. Please wait for the current operation to complete.`);
    }

    // Create unique operation promises for each tile
    const promise = operation();
    const operationId = `move-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const sourceOperationData = {
      type: 'move' as const,
      promise: promise,
      startTime: Date.now(),
      operationId
    };

    const targetOperationData = {
      type: 'move' as const,
      promise: promise,
      startTime: Date.now(),
      operationId
    };

    this.pendingOperations.set(sourceCoordId, sourceOperationData);
    this.pendingOperations.set(targetCoordId, targetOperationData);

    // Emit operation started events for both tiles
    this.config.eventBus?.emit({
      type: 'cache.operation.started',
      source: 'map_cache',
      payload: {
        coordId: sourceCoordId,
        operationType: 'move',
        operationId,
      },
      timestamp: new Date(),
    });
    this.config.eventBus?.emit({
      type: 'cache.operation.started',
      source: 'map_cache',
      payload: {
        coordId: targetCoordId,
        operationType: 'move',
        operationId,
      },
      timestamp: new Date(),
    });

    let success = false;
    try {
      const result = await promise;
      success = true;
      return result;
    } catch (error) {
      throw error;
    } finally {
      // Only clean up tiles that belong to THIS operation

      const sourceOp = this.pendingOperations.get(sourceCoordId);
      const targetOp = this.pendingOperations.get(targetCoordId);

      if (sourceOp?.operationId === operationId) {
        this.pendingOperations.delete(sourceCoordId);

        // Emit completion event for source tile
        this.config.eventBus?.emit({
          type: 'cache.operation.completed',
          source: 'map_cache',
          payload: {
            coordId: sourceCoordId,
            operationType: 'move',
            operationId,
            success,
          },
          timestamp: new Date(),
        });
      }

      if (targetOp?.operationId === operationId) {
        this.pendingOperations.delete(targetCoordId);

        // Emit completion event for target tile
        this.config.eventBus?.emit({
          type: 'cache.operation.completed',
          source: 'map_cache',
          payload: {
            coordId: targetCoordId,
            operationType: 'move',
            operationId,
            success,
          },
          timestamp: new Date(),
        });
      }

    }
  }

  async createItem(coordId: string, data: Omit<MapItemCreateAttributes, 'coords' | 'itemType'> & { parentId?: number }): Promise<MutationResult> {
    return this.trackOperation(coordId, 'create', async () => {
      const changeId = this.tracker.generateChangeId();

      try {
        const coords = CoordSystem.parseId(coordId);
        const parentId = await this._resolveParentId(coords, data.parentId);

        // Emit operation started event
        this.config.eventBus?.emit({
          type: 'map.operation_started',
          payload: {
            operation: 'create',
            tileId: coordId,
            tileName: data.title ?? 'New tile',
          },
          source: 'map_cache',
          timestamp: new Date(),
        });

        // Apply optimistic update
        const optimisticItem = this._createOptimisticItem(coordId, coords, data, parentId);
        this._applyOptimisticCreate(coordId, optimisticItem, changeId);

        // Make server call — safely convert parentId (omit when unknown)
        const parentIdNumber = parentId !== null ? Number(parentId) : undefined;
        if (parentId !== null && !Number.isFinite(parentIdNumber)) {
          throw new Error(`Invalid parentId from cache: ${parentId}`);
        }
        const result = await this.config.addItemMutation.mutateAsync({
          coords,
          itemType: MapItemType.BASE,
          ...(parentIdNumber !== undefined ? { parentId: parentIdNumber } : {}),
          title: data.title,
          content: data.content,
          preview: data.preview,
          link: data.link,
        });

        // Finalize with real data
        await this._finalizeCreate(coordId, result, changeId);

        // Emit create event
        this._emitCreateEvent(result, coordId, parentId);

        return { success: true, data: result };
      } catch (error) {
        await this._rollbackCreate(coordId, changeId);
        throw error;
      }
    });
  }

  async updateItem(coordId: string, data: MapItemUpdateAttributes): Promise<MutationResult> {
    return this.trackOperation(coordId, 'update', async () => {
      const changeId = this.tracker.generateChangeId();
      const existingItem = this._getExistingItem(coordId);

      try {
        // Emit operation started event
        this.config.eventBus?.emit({
          type: 'map.operation_started',
          payload: {
            operation: 'update',
            tileId: coordId,
            tileName: data.title ?? existingItem.data.title,
          },
          source: 'map_cache',
          timestamp: new Date(),
        });

        // Apply optimistic update
        const { optimisticItem, previousData } = this._prepareOptimisticUpdate(existingItem, data);
        this._applyOptimisticUpdate(coordId, optimisticItem, previousData, changeId);

        // Make server call
        const coords = CoordSystem.parseId(coordId);
        const result = await this.config.updateItemMutation.mutateAsync({
          coords,
          title: data.title,
          content: data.content,
          preview: data.preview,
          link: data.link,
        });

        // Finalize with real data
        await this._finalizeUpdate(coordId, result, changeId);

        // Emit update event
        this._emitUpdateEvent(result, coordId);

        return { success: true, data: result };
      } catch (error) {
        this._rollbackToPreviousData(changeId);
        throw error;
      }
    });
  }

  async deleteItem(coordId: string): Promise<MutationResult> {
    return this.trackOperation(coordId, 'delete', async () => {
      // deleteItem called with coordId
      const changeId = this.tracker.generateChangeId();
      // Generated change ID

      const existingItem = this._getExistingItem(coordId);
      // Found existing item

      try {
        // Emit operation started event
        this.config.eventBus?.emit({
          type: 'map.operation_started',
          payload: {
            operation: 'delete',
            tileId: coordId,
            tileName: existingItem.data.title,
          },
          source: 'map_cache',
          timestamp: new Date(),
        });

        // Apply optimistic removal
        const previousData = this._reconstructApiData(existingItem);
        // Applying optimistic delete
        this._applyOptimisticDelete(coordId, previousData, changeId);

        // Make server call
        const coords = CoordSystem.parseId(coordId);
        // Making server delete call
        await this.config.deleteItemMutation.mutateAsync({ coords });
        // Server delete successful

        // Finalize deletion
        await this._finalizeDelete(String(existingItem.metadata.dbId), changeId);
        // Delete finalized

        // Emit delete event
        this._emitDeleteEvent(existingItem);

        return { success: true };
      } catch (error) {
        // Delete failed
        this._rollbackToPreviousData(changeId);
        throw error;
      }
    });
  }

  async moveItem(sourceCoordId: string, targetCoordId: string): Promise<MutationResult & { isSwap?: boolean }> {
    if (!this.config.moveItemMutation) {
      throw new Error("Move item mutation not configured");
    }

    // Note: Validation is performed in the client-side drag service before reaching this point
    // This ensures UI validation happens immediately and server calls only happen for valid operations

    return this._trackMoveOperation(sourceCoordId, targetCoordId, async () => {
      const changeId = this.tracker.generateChangeId();
      const moveParams = this._prepareMoveOperation(sourceCoordId, targetCoordId, changeId);

      try {
        // Emit operation started event
        this.config.eventBus?.emit({
          type: 'map.operation_started',
          payload: {
            operation: moveParams.isSwap ? 'swap' : 'move',
            tileId: sourceCoordId,
            tileName: moveParams.sourceItem.data.title,
          },
          source: 'map_cache',
          timestamp: new Date(),
        });

        // Apply optimistic changes
        this._applyOptimisticChange(moveParams);

        // Execute server mutation
        const result = await this._executeMoveOnServer(moveParams);

        // Finalize the operation
        await this._finalizeMoveOperation(result, moveParams);

        return { success: true, data: result.modifiedItems[0], isSwap: moveParams.isSwap };
      } catch (error) {
        this._rollbackMove(moveParams.rollbackState, changeId);
        throw error;
      }
    });
  }

  async copyItem(sourceCoordId: string, destinationCoordId: string, destinationParentId: string): Promise<MutationResult> {
    if (!this.config.copyItemMutation) {
      throw new Error("Copy item mutation not configured");
    }

    // Prevent copying item to itself
    if (sourceCoordId === destinationCoordId) {
      throw new Error("Cannot copy item to itself");
    }

    return this.trackOperation(sourceCoordId, 'copy', async () => {
      const changeId = this.tracker.generateChangeId();
      const sourceItem = this._getExistingItem(sourceCoordId);

      // Track all coordIds that will be optimistically created (for rollback)
      const optimisticCoordIds: string[] = [];

      try {
        // Emit operation started event
        this.config.eventBus?.emit({
          type: 'map.operation_started',
          payload: {
            operation: 'copy',
            tileId: sourceCoordId,
            tileName: sourceItem.data.title,
          },
          source: 'map_cache',
          timestamp: new Date(),
        });

        // Get all descendants of source item
        const currentState = this.config.getState();
        const descendants = this._getAllDescendants(sourceCoordId, currentState.itemsById);

        // Apply optimistic deep copy
        const optimisticItems = this._createOptimisticCopy(
          sourceItem,
          descendants,
          sourceCoordId,
          destinationCoordId,
          destinationParentId
        );

        // Track coordIds for rollback
        optimisticItems.forEach(item => optimisticCoordIds.push(item.coordinates));

        // Apply optimistic updates to cache
        this.config.dispatch(cacheActions.loadRegion(optimisticItems, destinationCoordId, 1));
        this.tracker.trackChange(changeId, {
          type: 'create',
          coordId: destinationCoordId,
          metadata: { optimisticCoordIds }
        });

        // Make server call
        const sourceCoords = CoordSystem.parseId(sourceCoordId);
        const destinationCoords = CoordSystem.parseId(destinationCoordId);

        const destinationParentIdNumber = Number(destinationParentId);
        if (!Number.isFinite(destinationParentIdNumber)) {
          throw new Error(`Invalid destinationParentId: ${destinationParentId}`);
        }

        if (!this.config.copyItemMutation) {
          throw new Error("Copy item mutation not configured");
        }

        const copiedRootItem = await this.config.copyItemMutation.mutateAsync({
          sourceCoords,
          destinationCoords,
          destinationParentId: destinationParentIdNumber,
        });

        // Finalize with real server data
        await this._finalizeCopy(copiedRootItem, optimisticItems, changeId, destinationCoordId);

        // Emit success event
        this._emitCopyEvent(sourceItem, copiedRootItem, sourceCoordId, destinationCoordId);

        return { success: true, data: copiedRootItem };
      } catch (error) {
        // Rollback: remove all optimistically created items
        this._rollbackCopy(optimisticCoordIds, changeId);
        throw error;
      }
    });
  }

  async deleteChildrenByType(
    coordId: string,
    directionType: 'structural' | 'composed' | 'executionHistory'
  ): Promise<MutationResult & { deletedCount: number }> {
    if (!this.config.removeChildrenByTypeMutation) {
      throw new Error("Remove children by type mutation not configured");
    }

    return this.trackOperation(coordId, 'delete', async () => {
      const changeId = this.tracker.generateChangeId();
      const existingItem = this._getExistingItem(coordId);

      // Get all children that will be deleted for optimistic update
      const currentState = this.config.getState();
      const childrenToDelete = this._getChildrenByDirectionType(
        coordId,
        directionType,
        currentState.itemsById
      );

      // Store previous state for rollback
      const previousChildrenData: MapItemAPIContract[] = childrenToDelete.map(
        child => this._reconstructApiData(child)
      );

      try {
        // Emit operation started event
        this.config.eventBus?.emit({
          type: 'map.operation_started',
          payload: {
            operation: 'delete',
            tileId: coordId,
            tileName: `${existingItem.data.title} (${directionType} children)`,
          },
          source: 'map_cache',
          timestamp: new Date(),
        });

        // Apply optimistic removal of children
        this._applyOptimisticDeleteChildren(childrenToDelete, previousChildrenData, changeId);

        // Make server call
        const coords = CoordSystem.parseId(coordId);
        const result = await this.config.removeChildrenByTypeMutation!.mutateAsync({
          coords,
          directionType,
        });

        // Finalize deletion
        await this._finalizeDeleteChildren(childrenToDelete, changeId);

        // Emit delete event
        this._emitDeleteChildrenEvent(existingItem, directionType, result.deletedCount);

        return { success: true, deletedCount: result.deletedCount };
      } catch (error) {
        // Rollback: restore all deleted children
        this._rollbackDeleteChildren(previousChildrenData, changeId);
        throw error;
      }
    });
  }

  private _getChildrenByDirectionType(
    parentCoordId: string,
    directionType: 'structural' | 'composed' | 'executionHistory',
    itemsById: Record<string, TileData>
  ): TileData[] {
    const parentCoords = CoordSystem.parseId(parentCoordId);

    return Object.values(itemsById).filter(item => {
      // Must be a descendant of parent
      if (!CoordSystem.isDescendant(item.metadata.coordId, parentCoordId)) {
        return false;
      }

      // Get the first direction after the parent path
      const itemCoords = CoordSystem.parseId(item.metadata.coordId);
      const firstChildDirection = itemCoords.path[parentCoords.path.length];

      if (firstChildDirection === undefined) {
        return false;
      }

      // Filter based on direction type
      switch (directionType) {
        case 'structural':
          return firstChildDirection > Direction.Center;
        case 'composed':
          return firstChildDirection < Direction.Center;
        case 'executionHistory':
          // Delete ALL execution history tiles in the subtree
          // This includes any tile that has direction 0 anywhere in its path after parent
          const pathAfterParent = itemCoords.path.slice(parentCoords.path.length);
          return pathAfterParent.includes(Direction.Center);
        default:
          return false;
      }
    });
  }

  private _applyOptimisticDeleteChildren(
    children: TileData[],
    previousData: MapItemAPIContract[],
    changeId: string
  ): void {
    // Track the deletion for rollback
    this.tracker.trackChange(changeId, {
      type: 'delete',
      coordId: children[0]?.metadata.coordId ?? '',
      metadata: { previousChildrenData: previousData }
    });

    // Remove all children from cache
    children.forEach(child => {
      this.config.dispatch(cacheActions.removeItem(child.metadata.coordId));
    });
  }

  private async _finalizeDeleteChildren(
    children: TileData[],
    changeId: string
  ): Promise<void> {
    // Remove from storage
    for (const child of children) {
      await this.config.storageService.remove(`item:${child.metadata.dbId}`);
    }
    this.tracker.removeChange(changeId);
  }

  private _rollbackDeleteChildren(
    previousData: MapItemAPIContract[],
    changeId: string
  ): void {
    // Restore all deleted children
    if (previousData.length > 0 && previousData[0]) {
      this.config.dispatch(cacheActions.loadRegion(previousData, previousData[0].coordinates, 1));
    }
    this.tracker.removeChange(changeId);
  }

  private _emitDeleteChildrenEvent(
    parentItem: TileData,
    directionType: 'structural' | 'composed' | 'executionHistory',
    deletedCount: number
  ): void {
    if (!this.config.eventBus) return;

    this.config.eventBus.emit({
      type: 'map.children_deleted',
      source: 'map_cache',
      payload: {
        parentId: String(parentItem.metadata.dbId),
        parentName: parentItem.data.title,
        coordId: parentItem.metadata.coordId,
        directionType,
        deletedCount,
      }
    });
  }

  private _applyOptimisticSwap(
    sourceItem: TileData,
    targetItem: TileData,
    sourceCoordId: string,
    targetCoordId: string,
    changeId: string,
    rollbackState?: Record<string, MapItemAPIContract | undefined>
  ): void {
    // Get current cache state
    const currentState = this.config.getState();
    const { itemsById } = currentState;
    
    // Parse coordinates once for reuse
    const parsedSource = CoordSystem.parseId(sourceCoordId);
    const parsedTarget = CoordSystem.parseId(targetCoordId);
    
    // Get all descendants before swap
    const descendantsSource = this._getAllDescendants(sourceCoordId, itemsById);
    const descendantsTarget = this._getAllDescendants(targetCoordId, itemsById);
    
    // Prepare items to update: swapped parents + relocated direct children
    const itemsToUpdate: MapItemAPIContract[] = [];
    
    // 1. Add swapped parent items with correct depth
    itemsToUpdate.push({
      ...this._reconstructApiData(sourceItem),
      coordinates: targetCoordId,
      depth: parsedTarget.path.length,
    });
    
    itemsToUpdate.push({
      ...this._reconstructApiData(targetItem),
      coordinates: sourceCoordId,
      depth: parsedSource.path.length,
    });
    
    // 2. Add relocated direct children (only first generation)
    // Select by path length AND verify parent relationship
    const directChildrenSource = descendantsSource.filter(item => {
      const p = CoordSystem.parseId(item.metadata.coordId).path;
      return p.length === parsedSource.path.length + 1
        && parsedSource.path.every((seg, i) => seg === p[i]);
    });
    const directChildrenTarget = descendantsTarget.filter(item => {
      const p = CoordSystem.parseId(item.metadata.coordId).path;
      return p.length === parsedTarget.path.length + 1
        && parsedTarget.path.every((seg, i) => seg === p[i]);
    });
    
    // Relocate source's children to target's position
    directChildrenSource.forEach(child => {
      // Capture rollback for child before relocation
      if (rollbackState) {
        rollbackState[String(child.metadata.coordId)] = this._reconstructApiData(child);
      }
      const childCoords = CoordSystem.parseId(child.metadata.coordId);
      const relativePath = childCoords.path.slice(parsedSource.path.length);
      const newPath = [...parsedTarget.path, ...relativePath];
      const newCoordId = CoordSystem.createId({ ...childCoords, path: newPath });
      
      itemsToUpdate.push({
        ...this._reconstructApiData(child),
        coordinates: newCoordId,
        depth: newPath.length,
      });
    });
    
    // Relocate target's children to source's position
    directChildrenTarget.forEach(child => {
      // Capture rollback for child before relocation
      if (rollbackState) {
        rollbackState[String(child.metadata.coordId)] = this._reconstructApiData(child);
      }
      const childCoords = CoordSystem.parseId(child.metadata.coordId);
      const relativePath = childCoords.path.slice(parsedTarget.path.length);
      const newPath = [...parsedSource.path, ...relativePath];
      const newCoordId = CoordSystem.createId({ ...childCoords, path: newPath });
      
      itemsToUpdate.push({
        ...this._reconstructApiData(child),
        coordinates: newCoordId,
        depth: newPath.length,
      });
    });
    
    // Then apply updates
    this.config.dispatch(cacheActions.loadRegion(itemsToUpdate, sourceCoordId, 1));
    
    // Track both sides for rollback to ensure complete restoration
    // Store source side
    this.tracker.trackChange(changeId + '_source', { 
      type: 'update' as const, 
      coordId: sourceCoordId,
      previousData: this._reconstructApiData(sourceItem),
    });
    // Store target side
    this.tracker.trackChange(changeId + '_target', { 
      type: 'update' as const, 
      coordId: targetCoordId,
      previousData: this._reconstructApiData(targetItem),
    });
  }

  private _applyOptimisticMove(
    sourceItem: TileData,
    sourceCoordId: string,
    targetCoordId: string,
    changeId: string
  ): void {
    // Create moved item with new coordinates
    const movedItem: MapItemAPIContract = {
      ...this._reconstructApiData(sourceItem),
      coordinates: targetCoordId,
      depth: CoordSystem.parseId(targetCoordId).path.length,
    };
    
    // Remove from old position
    this.config.dispatch(cacheActions.removeItem(sourceCoordId));
    
    // Add to new position
    this.config.dispatch(cacheActions.loadRegion([movedItem], targetCoordId, 1));
    
    // Track for rollback
    this.tracker.trackChange(changeId, { 
      type: 'update' as const, 
      coordId: sourceCoordId,
      previousData: this._reconstructApiData(sourceItem),
    });
  }

  private _rollbackMove(
    previousState: Record<string, MapItemAPIContract | undefined>,
    changeId: string
  ): void {
    // Restore previous state
    const itemsToRestore = Object.values(previousState).filter((item): item is MapItemAPIContract => !!item);
    if (itemsToRestore.length > 0) {
      const firstItem = itemsToRestore[0];
      if (firstItem) {
        this.config.dispatch(cacheActions.loadRegion(itemsToRestore, firstItem.coordinates, 1));
      }
    }
    
    this.tracker.removeChange(changeId);
    this.tracker.removeChange(changeId + '_source');
    this.tracker.removeChange(changeId + '_target');
  }

  rollbackChange(changeId: string): void {
    const change = this.tracker.getChange(changeId);
    if (!change) return;
    
    switch (change.type) {
      case 'create':
        this.config.dispatch(cacheActions.invalidateRegion(change.coordId));
        break;
      case 'update':
      case 'delete':
        if (change.previousData) {
          this.config.dispatch(cacheActions.loadRegion([change.previousData], change.coordId, 1));
        }
        break;
    }
    
    this.tracker.removeChange(changeId);
  }

  rollbackAll(): void {
    this.tracker.getAllChanges().forEach(change => {
      this.rollbackChange(change.id);
    });
  }

  getPendingChanges(): Array<{
    id: string;
    type: "create" | "update" | "delete";
    coordId: string;
    timestamp: number;
  }> {
    return this.tracker.getAllChanges();
  }

  // Private helper methods
  private async _resolveParentId(coords: ReturnType<typeof CoordSystem.parseId>, providedParentId?: number): Promise<string | null> {
    if (providedParentId !== undefined && providedParentId !== null) {
      return providedParentId.toString();
    }

    const parentCoords = CoordSystem.getParentCoord(coords);
    if (!parentCoords) return null;

    const parentCoordId = CoordSystem.createId(parentCoords);
    const parentItem = this.config.getState().itemsById[parentCoordId];

    return parentItem ? String(parentItem.metadata.dbId) : null;
  }

  private _createOptimisticItem(
    coordId: string,
    coords: ReturnType<typeof CoordSystem.parseId>,
    data: {
      title?: string;
      name?: string;
      description?: string;
      content?: string;
      preview?: string;
      link?: string;
    },
    parentId: string | null
  ): MapItemAPIContract {
    return {
      id: `temp_${Date.now()}`,
      coordinates: coordId,
      title: data.title ?? "New Item",
      content: data.content ?? "",
      preview: data.preview,
      link: data.link ?? "",
      depth: coords.path.length,
      parentId,
      itemType: MapItemType.BASE,
      ownerId: this.config.mapContext?.userId ?? "unknown",
      originId: null,
    };
  }

  private _applyOptimisticCreate(
    coordId: string,
    optimisticItem: MapItemAPIContract,
    changeId: string
  ): void {
    this.config.dispatch(cacheActions.loadRegion([optimisticItem], coordId, 1));
    this.tracker.trackChange(changeId, { type: 'create', coordId });
  }

  private async _finalizeCreate(
    coordId: string,
    result: MapItemAPIContract,
    changeId: string
  ): Promise<void> {
    this.config.dispatch(cacheActions.loadRegion([result], coordId, 1));

    // Check if this is a composition child (direction 0 or negative direction)
    const coords = CoordSystem.parseId(coordId);
    const lastDirection = coords.path[coords.path.length - 1];
    const isCompositionChild = lastDirection !== undefined && (lastDirection as number) <= 0;

    if (isCompositionChild) {
      // Refresh parent's composition data so the new child appears
      const parentCoords = CoordSystem.getParentCoord(coords);
      if (parentCoords) {
        const parentCoordId = CoordSystem.createId(parentCoords);
        try {
          await this.config.dataOperations.fetchCompositionChildren?.(parentCoordId);
        } catch (error) {
          console.warn('Failed to fetch parent composition children:', error);
        }
      }
    }

    try {
      await this.config.storageService.save(`item:${result.id}`, result);
    } catch (e) {
      // Best-effort persistence; do not break UX if local storage fails
      console.warn('MapCache storage save failed on create:', e);
    }
    this.tracker.removeChange(changeId);
  }

  private async _rollbackCreate(coordId: string, changeId: string): Promise<void> {
    // Simply remove the optimistically created item
    this.config.dispatch(cacheActions.removeItem(coordId));
    this.tracker.removeChange(changeId);
  }

  private _getExistingItem(coordId: string): TileData {
    const existingItem = this.config.getState().itemsById[coordId];
    if (!existingItem) {
      throw new Error(`Item not found at ${coordId}`);
    }
    return existingItem;
  }

  private _prepareOptimisticUpdate(
    existingItem: TileData,
    data: {
      title?: string;
      name?: string;
      description?: string;
      content?: string;
      preview?: string;
      link?: string;
    }
  ): { optimisticItem: MapItemAPIContract; previousData: MapItemAPIContract } {
    const previousData = this._reconstructApiData(existingItem);
    const optimisticItem: MapItemAPIContract = {
      ...previousData,
      title: data.title ?? existingItem.data.title,
      content: data.content ?? existingItem.data.content,
      preview: data.preview ?? existingItem.data.preview,
      link: data.link ?? existingItem.data.link,
    };
    return { optimisticItem, previousData };
  }

  private _applyOptimisticUpdate(
    coordId: string,
    optimisticItem: MapItemAPIContract,
    previousData: MapItemAPIContract,
    changeId: string
  ): void {
    this.config.dispatch(cacheActions.loadRegion([optimisticItem], coordId, 1));
    this.tracker.trackChange(changeId, { 
      type: 'update', 
      coordId,
      previousData
    });
  }

  private async _finalizeUpdate(
    coordId: string,
    result: MapItemAPIContract,
    changeId: string
  ): Promise<void> {
    this.config.dispatch(cacheActions.loadRegion([result], coordId, 1));
    try {
      await this.config.storageService.save(`item:${result.id}`, result);
    } catch (e) {
      console.warn('MapCache storage save failed on update:', e);
    }
    this.tracker.removeChange(changeId);
  }

  private _applyOptimisticDelete(
    coordId: string,
    previousData: MapItemAPIContract,
    changeId: string
  ): void {
    // Tracking delete change
    this.tracker.trackChange(changeId, { 
      type: 'delete', 
      coordId,
      previousData
    });
    // Dispatching removeItem action
    this.config.dispatch(cacheActions.removeItem(coordId));
  }

  private async _finalizeDelete(itemId: string, changeId: string): Promise<void> {
    // Removing from storage
    await this.config.storageService.remove(`item:${itemId}`);
    // Removing change tracker
    this.tracker.removeChange(changeId);
  }

  private _rollbackToPreviousData(changeId: string): void {
    const change = this.tracker.getChange(changeId);
    if (change?.previousData) {
      this.config.dispatch(cacheActions.loadRegion([change.previousData], change.coordId, 1));
    }
    this.tracker.removeChange(changeId);
  }

  private _reconstructApiData(tile: TileData): MapItemAPIContract {
    return {
      id: String(tile.metadata.dbId),
      coordinates: tile.metadata.coordId,
      depth: tile.metadata.depth,
      title: tile.data.title,
      content: tile.data.content,
      preview: tile.data.preview,
      link: tile.data.link,
      parentId: null, // We don't store this in TileData
      itemType: MapItemType.BASE,
      ownerId: tile.metadata.ownerId ?? this.config.mapContext?.userId ?? "unknown",
      originId: null,
    };
  }

  private _prepareMoveOperation(sourceCoordId: string, targetCoordId: string, changeId: string) {
    const sourceItem = this._getExistingItem(sourceCoordId);
    const targetItem = this.config.getState().itemsById[targetCoordId];
    const isSwap = !!targetItem;
    
    const rollbackState: Record<string, MapItemAPIContract | undefined> = {
      [sourceCoordId]: this._reconstructApiData(sourceItem)
    };
    
    if (isSwap && targetItem) {
      rollbackState[targetCoordId] = this._reconstructApiData(targetItem);
    }
    
    return {
      sourceItem,
      targetItem,
      sourceCoordId,
      targetCoordId,
      changeId,
      isSwap,
      rollbackState
    };
  }

  private _applyOptimisticChange(moveParams: ReturnType<typeof this._prepareMoveOperation>) {
    if (moveParams.isSwap && moveParams.targetItem) {
      this._applyOptimisticSwap(
        moveParams.sourceItem,
        moveParams.targetItem,
        moveParams.sourceCoordId,
        moveParams.targetCoordId,
        moveParams.changeId,
        moveParams.rollbackState
      );
    } else {
      this._applyOptimisticMove(
        moveParams.sourceItem,
        moveParams.sourceCoordId,
        moveParams.targetCoordId,
        moveParams.changeId
      );
    }
  }

  private async _executeMoveOnServer(moveParams: ReturnType<typeof this._prepareMoveOperation>) {
    const sourceCoords = CoordSystem.parseId(moveParams.sourceCoordId);
    const targetCoords = CoordSystem.parseId(moveParams.targetCoordId);
    
    return await this.config.moveItemMutation!.mutateAsync({
      oldCoords: sourceCoords,
      newCoords: targetCoords,
    });
  }

  private async _finalizeMoveOperation(
    result: { modifiedItems: MapItemAPIContract[] },
    moveParams: ReturnType<typeof this._prepareMoveOperation>
  ) {
    // Remove stale cache entries before loading new ones
    if (result.modifiedItems?.length > 0) {
      // Calculate OLD coordIds that need to be removed
      const staleCoordIds = this._calculateStaleCoordIds(
        result.modifiedItems,
        moveParams.sourceCoordId,
        moveParams.targetCoordId
      );

      // Remove stale entries from cache
      staleCoordIds.forEach(oldCoordId => {
        this.config.dispatch(cacheActions.removeItem(oldCoordId));
      });

      // Apply server response with NEW coordinates
      this.config.dispatch(cacheActions.loadRegion(result.modifiedItems, moveParams.targetCoordId, 1));
    }

    // Clear tracking
    this.tracker.removeChange(moveParams.changeId);
    this.tracker.removeChange(moveParams.changeId + '_source');
    this.tracker.removeChange(moveParams.changeId + '_target');

    // Emit appropriate event
    this._emitMoveEvent(moveParams);
  }

  private _emitMoveEvent(moveParams: ReturnType<typeof this._prepareMoveOperation>) {
    if (!this.config.eventBus) return;
    
    if (moveParams.isSwap && moveParams.targetItem) {
      this.config.eventBus.emit({
        type: 'map.tiles_swapped',
        source: 'map_cache',
        payload: {
          tile1Id: String(moveParams.sourceItem.metadata.dbId),
          tile1Name: moveParams.sourceItem.data.title,
          tile2Id: String(moveParams.targetItem.metadata.dbId),
          tile2Name: moveParams.targetItem.data.title
        }
      });
    } else {
      this.config.eventBus.emit({
        type: 'map.tile_moved',
        source: 'map_cache',
        payload: {
          tileId: String(moveParams.sourceItem.metadata.dbId),
          tileName: moveParams.sourceItem.data.title,
          fromCoordId: moveParams.sourceCoordId,
          toCoordId: moveParams.targetCoordId
        }
      });
    }
  }

  private _getAllDescendants(parentCoordId: string, itemsById: Record<string, TileData>): TileData[] {
    return Object.values(itemsById).filter(item =>
      item.metadata.coordId !== parentCoordId &&
      CoordSystem.isDescendant(item.metadata.coordId, parentCoordId)
    );
  }

  /**
   * Calculate OLD coordIds that need to be removed from cache after a move operation.
   *
   * For each modified item with NEW coordinates, this calculates where it was BEFORE the move
   * by computing the relative path from target and applying it to source.
   *
   * Example:
   * - Source: [1], Target: [2]
   * - Modified item NEW coords: [2,0,1] (child at direction 0, then 1)
   * - Relative path from target [2] to item [2,0,1] = [0,1]
   * - OLD coords: [1] + [0,1] = [1,0,1]
   * - OLD coordId to remove: "userId,groupId:[1,0,1]"
   */
  private _calculateStaleCoordIds(
    modifiedItems: MapItemAPIContract[],
    sourceCoordId: string,
    targetCoordId: string
  ): string[] {
    const sourceCoords = CoordSystem.parseId(sourceCoordId);
    const targetCoords = CoordSystem.parseId(targetCoordId);
    const staleCoordIds: string[] = [];

    for (const item of modifiedItems) {
      const newCoords = CoordSystem.parseId(item.coordinates);

      // Calculate relative path from target to the new position
      // This tells us how far "down" from target the item is
      const relativePath = newCoords.path.slice(targetCoords.path.length);

      // Apply the same relative path to the source to get old position
      const oldPath: Direction[] = [...sourceCoords.path, ...relativePath];

      const oldCoordId = CoordSystem.createId({
        userId: sourceCoords.userId,
        groupId: sourceCoords.groupId,
        path: oldPath
      });

      staleCoordIds.push(oldCoordId);
    }

    return staleCoordIds;
  }

  /**
   * Create optimistic deep copy of source tree at destination
   */
  private _createOptimisticCopy(
    sourceItem: TileData,
    descendants: TileData[],
    sourceCoordId: string,
    destinationCoordId: string,
    destinationParentId: string
  ): MapItemAPIContract[] {
    const sourceCoords = CoordSystem.parseId(sourceCoordId);
    const destinationCoords = CoordSystem.parseId(destinationCoordId);
    const optimisticItems: MapItemAPIContract[] = [];

    // Map from original coordinate ID to optimistic item ID
    // This preserves parent-child relationships across the copied tree
    const coordToOptimisticId = new Map<string, string>();

    // Create optimistic copy of root item
    const rootOptimisticId = `temp_copy_${Date.now()}_root`;
    const rootCopy: MapItemAPIContract = {
      ...this._reconstructApiData(sourceItem),
      id: rootOptimisticId,
      coordinates: destinationCoordId,
      depth: destinationCoords.path.length,
      parentId: destinationParentId,
      originId: String(sourceItem.metadata.dbId),
    };
    optimisticItems.push(rootCopy);
    coordToOptimisticId.set(destinationCoordId, rootOptimisticId);

    // Create optimistic copies of all descendants
    descendants.forEach((descendant) => {
      const descendantCoords = CoordSystem.parseId(descendant.metadata.coordId);

      // Calculate relative path from source
      const relativePath = descendantCoords.path.slice(sourceCoords.path.length);

      // Apply relative path to destination
      const newPath = [...destinationCoords.path, ...relativePath];
      const newCoordId = CoordSystem.createId({
        ...destinationCoords,
        path: newPath
      });

      // Find parent's optimistic ID by looking up parent coordinate
      const parentPath = newPath.slice(0, -1);
      const parentCoordId = CoordSystem.createId({
        ...destinationCoords,
        path: parentPath
      });
      const optimisticParentId = coordToOptimisticId.get(parentCoordId);

      const descendantOptimisticId = `temp_copy_${Date.now()}_${descendant.metadata.dbId}`;
      const descendantCopy: MapItemAPIContract = {
        ...this._reconstructApiData(descendant),
        id: descendantOptimisticId,
        coordinates: newCoordId,
        depth: newPath.length,
        parentId: optimisticParentId ?? null,
        originId: String(descendant.metadata.dbId),
      };
      optimisticItems.push(descendantCopy);
      coordToOptimisticId.set(newCoordId, descendantOptimisticId);
    });

    return optimisticItems;
  }

  /**
   * Finalize copy operation with server data
   */
  private async _finalizeCopy(
    copiedRootItem: MapItemAPIContract,
    optimisticItems: MapItemAPIContract[],
    changeId: string,
    destinationCoordId: string
  ): Promise<void> {
    // Build list of items to load into cache
    // Server only returns root item, so we update root and keep optimistic children
    const itemsToLoad: MapItemAPIContract[] = [copiedRootItem];

    // Build mapping from optimistic IDs to real IDs
    // The first optimistic item (root) maps to the server-returned root item
    const optimisticIdToRealId = new Map<string, string>();
    const rootOptimisticItem = optimisticItems[0];
    if (rootOptimisticItem) {
      optimisticIdToRealId.set(rootOptimisticItem.id, copiedRootItem.id);
    }

    // Update optimistic children with proper parent references
    // Process in order so we can build the ID mapping as we go
    optimisticItems.slice(1).forEach(optimisticItem => {
      // Map the optimistic parent ID to the real parent ID
      const realParentId = optimisticItem.parentId
        ? optimisticIdToRealId.get(optimisticItem.parentId) ?? optimisticItem.parentId
        : copiedRootItem.id; // Fallback to root if no parent set

      const updatedItem: MapItemAPIContract = {
        ...optimisticItem,
        parentId: realParentId,
      };
      itemsToLoad.push(updatedItem);
    });

    // Replace optimistic items with updated data
    this.config.dispatch(cacheActions.loadRegion(itemsToLoad, destinationCoordId, 1));

    // Save to storage (best-effort)
    try {
      for (const item of itemsToLoad) {
        await this.config.storageService.save(`item:${item.id}`, item);
      }
    } catch (e) {
      console.warn('MapCache storage save failed on copy:', e);
    }

    // Clear tracking
    this.tracker.removeChange(changeId);
  }

  /**
   * Rollback copy operation by removing all optimistically created items
   */
  private _rollbackCopy(optimisticCoordIds: string[], changeId: string): void {
    // Remove all optimistically created items
    optimisticCoordIds.forEach(coordId => {
      this.config.dispatch(cacheActions.removeItem(coordId));
    });

    // Clear tracking
    this.tracker.removeChange(changeId);
  }

  /**
   * Emit copy event via event bus
   */
  private _emitCopyEvent(
    sourceItem: TileData,
    copiedItem: MapItemAPIContract,
    sourceCoordId: string,
    destinationCoordId: string
  ): void {
    if (!this.config.eventBus) return;

    this.config.eventBus.emit({
      type: 'map.item_copied',
      source: 'map_cache',
      payload: {
        sourceId: String(sourceItem.metadata.dbId),
        sourceName: sourceItem.data.title,
        destinationId: copiedItem.id,
        fromCoordId: sourceCoordId,
        toCoordId: destinationCoordId
      }
    });
  }

  private _emitDeleteEvent(deletedItem: TileData): void {
    if (!this.config.eventBus) return;

    this.config.eventBus.emit({
      type: 'map.tile_deleted',
      source: 'map_cache',
      payload: {
        tileId: String(deletedItem.metadata.dbId),
        tileName: deletedItem.data.title,
        coordId: deletedItem.metadata.coordId
      }
    });
  }

  private _emitCreateEvent(createdItem: MapItemAPIContract, coordId: string, parentId: string | null): void {
    if (!this.config.eventBus) return;

    this.config.eventBus.emit({
      type: 'map.tile_created',
      source: 'map_cache',
      payload: {
        tileId: createdItem.id,
        tileName: createdItem.title,
        coordId,
        parentId: parentId ?? undefined
      }
    });
  }

  private _emitUpdateEvent(updatedItem: MapItemAPIContract, coordId: string): void {
    if (!this.config.eventBus) return;

    this.config.eventBus.emit({
      type: 'map.tile_updated',
      source: 'map_cache',
      payload: {
        tileId: updatedItem.id,
        tileName: updatedItem.title,
        coordId,
        changes: {}
      }
    });
  }

}