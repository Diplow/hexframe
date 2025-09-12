import type { StorageService, ServiceConfig } from "~/app/map/Cache/Services/types";
import { createStorageService } from "~/app/map/Cache/Services/storage/storage-core";
import { 
  createBrowserStorageOperations,
  createSSRStorageOperations,
  createMockStorageOperations
} from "~/app/map/Cache/Services/storage/storage-operations";

/**
 * Create storage service for browser environments
 */
export function createBrowserStorageService(
  config: ServiceConfig = {},
): StorageService {
  return createStorageService(createBrowserStorageOperations(), config);
}

/**
 * Create storage service for SSR environments
 */
export function createSSRStorageService(
  config: ServiceConfig = {},
): StorageService {
  return createStorageService(createSSRStorageOperations(), config);
}

/**
 * Create storage service for testing with mocked operations
 */
export function createMockStorageService(
  mockData: Record<string, string> = {},
  config: ServiceConfig = {},
): StorageService {
  return createStorageService(createMockStorageOperations(mockData), config);
}

/**
 * Create no-op storage service for environments that don't support persistence
 */
export function createNoOpStorageService(): StorageService {
  return createStorageService(createSSRStorageOperations());
}

/**
 * React hook for using storage service with optional configuration
 */
export function useStorageService(config: ServiceConfig = {}): StorageService {
  // In a real implementation, this would use React context or hooks
  // For now, return browser storage service as default
  return createBrowserStorageService(config);
}