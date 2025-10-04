import { type Dispatch } from "react";
import { CoordSystem, type Coord, type MapItemUpdateAttributes, type MapItemCreateAttributes } from "~/lib/domains/mapping/utils";
import type { MapItemAPIContract } from "~/server/api";
import type { CacheAction } from "~/app/map/Cache/State";
import { cacheActions } from "~/app/map/Cache/State";
import type { DataOperations } from "~/app/map/Cache/types/handlers";
import type { StorageService } from "~/app/map/Cache/Services";
import type { TileData } from "~/app/map/types";
import { OptimisticChangeTracker } from "~/app/map/Cache/Lifecycle/MutationCoordinator/optimistic-tracker";
import type { EventBusService } from '~/app/map';
import { MapItemType } from "~/lib/domains/mapping";

export interface MutationCoordinatorConfig {
  dispatch: Dispatch<CacheAction>;
  getState: () => { itemsById: Record<string, TileData> };
  dataOperations: DataOperations;
  storageService: StorageService;
  mapContext?: {
    userId: number;
    groupId: number;
    rootItemId: number;
  };
  // Pass mutations as dependencies
  addItemMutation: {
    mutateAsync: (params: {
      coords: Coord;
      parentId?: number | null;
      title?: string;
      content?: string;
      preview?: string;
      url?: string;
    }) => Promise<MapItemAPIContract>;
  };
  updateItemMutation: {
    mutateAsync: (params: {
      coords: Coord;
      title?: string;
      content?: string;
      preview?: string;
      url?: string;
    }) => Promise<MapItemAPIContract>;
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
    type: 'create' | 'update' | 'delete' | 'move';
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
  getPendingOperationType(coordId: string): 'create' | 'update' | 'delete' | 'move' | null {
    const operation = this.pendingOperations.get(coordId);
    return operation?.type ?? null;
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
    type: 'create' | 'update' | 'delete' | 'move',
    operation: () => Promise<T>
  ): Promise<T> {
    // Check if operation is already pending
    if (this.pendingOperations.has(coordId)) {
      throw new Error(`Operation already in progress for tile ${coordId}. Please wait for the current operation to complete.`);
    }

    // Start tracking the operation
    const promise = operation();
    this.pendingOperations.set(coordId, {
      type,
      promise,
      startTime: Date.now()
    });

    try {
      const result = await promise;
      return result;
    } finally {
      // Always clean up, even if operation fails
      this.pendingOperations.delete(coordId);
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


    try {
      const result = await promise;
      return result;
    } catch (error) {
      throw error;
    } finally {
      // Only clean up tiles that belong to THIS operation

      const sourceOp = this.pendingOperations.get(sourceCoordId);
      const targetOp = this.pendingOperations.get(targetCoordId);

      if (sourceOp?.operationId === operationId) {
        this.pendingOperations.delete(sourceCoordId);
      }

      if (targetOp?.operationId === operationId) {
        this.pendingOperations.delete(targetCoordId);
      }

    }
  }

  async createItem(coordId: string, data: MapItemCreateAttributes & { parentId?: number }): Promise<MutationResult> {
    const changeId = this.tracker.generateChangeId();
    
    try {
      const coords = CoordSystem.parseId(coordId);
      const parentId = await this._resolveParentId(coords, data.parentId);
      
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
        ...(parentIdNumber !== undefined ? { parentId: parentIdNumber } : {}),
        title: data.title,
        content: data.content,
        preview: data.preview,
        url: data.link,
      });
      
      // Finalize with real data
      await this._finalizeCreate(coordId, result, changeId);
      
      return { success: true, data: result };
    } catch (error) {
      await this._rollbackCreate(coordId, changeId);
      throw error;
    }
  }

  async updateItem(coordId: string, data: MapItemUpdateAttributes): Promise<MutationResult> {
    const changeId = this.tracker.generateChangeId();
    const existingItem = this._getExistingItem(coordId);

    try {
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
        url: data.link,
      });
      
      // Finalize with real data
      await this._finalizeUpdate(coordId, result, changeId);
      
      return { success: true, data: result };
    } catch (error) {
      this._rollbackToPreviousData(changeId);
      throw error;
    }
  }

  async deleteItem(coordId: string): Promise<MutationResult> {
    // deleteItem called with coordId
    const changeId = this.tracker.generateChangeId();
    // Generated change ID
    
    const existingItem = this._getExistingItem(coordId);
    // Found existing item
    
    try {
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
      
      return { success: true };
    } catch (error) {
      // Delete failed
      this._rollbackToPreviousData(changeId);
      throw error;
    }
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
      ownerId: this.config.mapContext?.userId.toString() ?? "unknown",
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
      ownerId: tile.metadata.ownerId ?? this.config.mapContext?.userId.toString() ?? "unknown",
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
    // Apply server response
    if (result.modifiedItems?.length > 0) {
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



}