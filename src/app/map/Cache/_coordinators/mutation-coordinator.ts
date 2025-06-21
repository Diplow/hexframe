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
    const changeId = this.tracker.generateChangeId();
    const existingItem = this._getExistingItem(coordId);
    
    try {
      // Apply optimistic removal
      const previousData = this._reconstructApiData(existingItem);
      this._applyOptimisticDelete(coordId, previousData, changeId);
      
      // Make server call
      const coords = CoordSystem.parseId(coordId);
      await this.config.deleteItemMutation.mutateAsync({ coords });
      
      // Finalize deletion
      await this._finalizeDelete(existingItem.metadata.dbId, changeId);
      
      return { success: true };
    } catch (error) {
      this._rollbackToPreviousData(changeId);
      throw error;
    }
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
    this.tracker.trackChange(changeId, { 
      type: 'delete', 
      coordId,
      previousData
    });
    this.config.dispatch(cacheActions.removeItem(coordId));
  }

  private async _finalizeDelete(itemId: string, changeId: string): Promise<void> {
    await this.config.storageService.remove(`item:${itemId}`);
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
}