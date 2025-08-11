import { type Dispatch } from "react";
import { CoordSystem, type Coord } from "~/lib/domains/mapping/utils/hex-coordinates";
import { MapItemType } from "~/lib/domains/mapping/types/contracts";
import type { MapItemAPIContract } from "~/server/api/types/contracts";
import type { CacheAction } from "../State/types";
import type { DataOperations } from "../Handlers/types";
import type { StorageService } from "../Services/types";
import type { TileData } from "../../types/tile-data";
import { cacheActions } from "../State/actions";
import { OptimisticChangeTracker } from "./optimistic-tracker";
import type { EventBusService } from "~/app/map/types/events";

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
      parentId: number;
      title?: string;
      descr?: string;
      url?: string;
    }) => Promise<MapItemAPIContract>;
  };
  updateItemMutation: {
    mutateAsync: (params: {
      coords: Coord;
      title?: string;
      descr?: string;
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

  constructor(private config: MutationCoordinatorConfig) {}

  async createItem(coordId: string, data: {
    parentId?: number;
    title?: string;
    name?: string;
    description?: string;
    descr?: string;
    url?: string;
  }): Promise<MutationResult> {
    const changeId = this.tracker.generateChangeId();
    
    try {
      const coords = CoordSystem.parseId(coordId);
      const parentId = await this._resolveParentId(coords, data.parentId);
      
      // Apply optimistic update
      const optimisticItem = this._createOptimisticItem(coordId, coords, data, parentId);
      this._applyOptimisticCreate(coordId, optimisticItem, changeId);
      
      // Make server call
      const result = await this.config.addItemMutation.mutateAsync({
        coords,
        parentId: parseInt(parentId ?? "0"),
        title: data.title ?? data.name,
        descr: data.description ?? data.descr,
        url: data.url,
      });
      
      // Finalize with real data
      await this._finalizeCreate(coordId, result, changeId);
      
      return { success: true, data: result };
    } catch (error) {
      await this._rollbackCreate(coordId, changeId);
      throw error;
    }
  }

  async updateItem(coordId: string, data: {
    title?: string;
    name?: string;
    description?: string;
    descr?: string;
    url?: string;
  }): Promise<MutationResult> {
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
        title: data.title ?? data.name,
        descr: data.description ?? data.descr,
        url: data.url,
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
      await this._finalizeDelete(existingItem.metadata.dbId, changeId);
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
  }

  private _applyOptimisticSwap(
    sourceItem: TileData,
    targetItem: TileData,
    sourceCoordId: string,
    targetCoordId: string,
    changeId: string
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
    if (providedParentId) {
      return providedParentId.toString();
    }
    
    const parentCoords = CoordSystem.getParentCoord(coords);
    if (!parentCoords) return null;
    
    const parentCoordId = CoordSystem.createId(parentCoords);
    const parentItem = this.config.getState().itemsById[parentCoordId];
    
    return parentItem?.metadata.dbId ?? null;
  }

  private _createOptimisticItem(
    coordId: string,
    coords: ReturnType<typeof CoordSystem.parseId>,
    data: {
      title?: string;
      name?: string;
      description?: string;
      descr?: string;
      url?: string;
    },
    parentId: string | null
  ): MapItemAPIContract {
    return {
      id: `temp_${Date.now()}`,
      coordinates: coordId,
      name: data.title ?? data.name ?? "New Item",
      descr: data.description ?? data.descr ?? "",
      url: data.url ?? "",
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
    await this.config.storageService.save(`item:${result.id}`, result);
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
      descr?: string;
      url?: string;
    }
  ): { optimisticItem: MapItemAPIContract; previousData: MapItemAPIContract } {
    const previousData = this._reconstructApiData(existingItem);
    const optimisticItem: MapItemAPIContract = {
      ...previousData,
      name: data.title ?? data.name ?? existingItem.data.name,
      descr: data.description ?? data.descr ?? existingItem.data.description,
      url: data.url ?? existingItem.data.url,
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
    await this.config.storageService.save(`item:${result.id}`, result);
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
      id: tile.metadata.dbId,
      coordinates: tile.metadata.coordId,
      depth: tile.metadata.depth,
      name: tile.data.name,
      descr: tile.data.description,
      url: tile.data.url,
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
        moveParams.changeId
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
          tile1Id: moveParams.sourceItem.metadata.dbId,
          tile1Name: moveParams.sourceItem.data.name,
          tile2Id: moveParams.targetItem.metadata.dbId,
          tile2Name: moveParams.targetItem.data.name
        }
      });
    } else {
      this.config.eventBus.emit({
        type: 'map.tile_moved',
        source: 'map_cache',
        payload: {
          tileId: moveParams.sourceItem.metadata.dbId,
          tileName: moveParams.sourceItem.data.name,
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