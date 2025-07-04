// Service interface types for dependency injection and mocking

import type { MapItemType } from "~/lib/domains/mapping/_objects/map-item";

export interface ServerService {
  // Data fetching operations (primary purpose)
  fetchItemsForCoordinate: (params: {
    centerCoordId: string;
    maxDepth: number;
  }) => Promise<{
    id: string;
    coordinates: string;
    depth: number;
    name: string;
    descr: string;
    url: string;
    parentId: string | null;
    itemType: MapItemType;
    ownerId: string;
  }[]>;

  // Additional query operations
  getItemByCoordinate: (coordId: string) => Promise<{
    id: string;
    coordinates: string;
    depth: number;
    name: string;
    descr: string;
    url: string;
    parentId: string | null;
    itemType: MapItemType;
    ownerId: string;
  } | null>;
  getRootItemById: (mapItemId: number) => Promise<{
    id: string;
    coordinates: string;
    depth: number;
    name: string;
    descr: string;
    url: string;
    parentId: string | null;
    itemType: MapItemType;
    ownerId: string;
  } | null>;
  getDescendants: (itemId: number) => Promise<{
    id: string;
    coordinates: string;
    depth: number;
    name: string;
    descr: string;
    url: string;
    parentId: string | null;
    itemType: MapItemType;
    ownerId: string;
  }[]>;
  getAncestors: (itemId: number) => Promise<{
    id: string;
    coordinates: string;
    depth: number;
    name: string;
    descr: string;
    url: string;
    parentId: string | null;
    itemType: MapItemType;
    ownerId: string;
  }[]>;

  // Mutation operations (architectural placeholders - should use mutation layer)
  createItem: (params: { coordId: string; data: Record<string, unknown> }) => Promise<unknown>;
  updateItem: (params: { coordId: string; data: Record<string, unknown> }) => Promise<unknown>;
  deleteItem: (params: { coordId: string }) => Promise<void>;
}

export interface StorageService {
  save: (key: string, data: unknown) => Promise<void>;
  load: (key: string) => Promise<unknown>;
  remove: (key: string) => Promise<void>;
  clear: () => Promise<void>;

  // Cache-specific operations for future enhancement
  saveCacheData: (cacheData: unknown) => Promise<void>;
  loadCacheData: () => Promise<unknown>;
  saveUserPreferences: (preferences: unknown) => Promise<void>;
  loadUserPreferences: () => Promise<unknown>;
  saveExpandedItems: (expandedItems: string[]) => Promise<void>;
  loadExpandedItems: () => Promise<string[]>;

  // Health check
  isAvailable: () => Promise<boolean>;
}

// Service configuration options
export interface ServiceConfig {
  enableRetry?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  timeoutMs?: number;
}

// Service factory types for dependency injection
export type ServiceFactory<T> = (config?: ServiceConfig) => T;

// Error types for service operations
export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export class NetworkError extends ServiceError {
  constructor(message: string, originalError?: Error) {
    super(message, "NETWORK_ERROR", originalError);
    this.name = "NetworkError";
  }
}

export class TimeoutError extends ServiceError {
  constructor(message: string) {
    super(message, "TIMEOUT_ERROR");
    this.name = "TimeoutError";
  }
}
