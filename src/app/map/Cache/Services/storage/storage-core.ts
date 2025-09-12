import type { StorageService, ServiceConfig } from "~/app/map/Cache/Services/types";
import type { StorageOperations } from "./storage-operations";

// Storage metadata for version control and debugging
const CURRENT_STORAGE_VERSION = "1.0.0";

interface StorageMetadata {
  version: string;
  timestamp: number;
  userAgent?: string;
}

interface StorageEnvelope<T = unknown> {
  metadata: StorageMetadata;
  data: T;
}

/**
 * Core storage service implementation
 * Creates a service with save/load/remove operations using provided storage operations
 */
export function createStorageService(
  storageOperations: StorageOperations,
  _config: ServiceConfig = {},
): StorageService {
  const save = async (key: string, data: unknown): Promise<void> => {
    try {
      const metadata: StorageMetadata = {
        version: CURRENT_STORAGE_VERSION,
        timestamp: Date.now(),
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      };

      const serializedData = JSON.stringify({
        metadata,
        data,
      });

      await storageOperations.setItem(key, serializedData);
    } catch (error) {
      console.warn(`Failed to save data for key ${key}:`, error);
      // Fail gracefully - don't throw errors for storage operations
    }
  };

  const load = async <T = unknown>(key: string): Promise<T | null> => {
    try {
      const serializedData = await storageOperations.getItem(key);
      if (!serializedData) {
        return null;
      }

      const parsed = JSON.parse(serializedData) as StorageEnvelope<T>;

      // Version compatibility check for future migrations
      if (parsed.metadata?.version !== CURRENT_STORAGE_VERSION) {
        console.warn(
          `Storage version mismatch for key ${key}. Expected ${CURRENT_STORAGE_VERSION}, got ${parsed.metadata?.version}`,
        );
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.warn(`Failed to load data for key ${key}:`, error);
      return null;
    }
  };

  const remove = async (key: string): Promise<void> => {
    try {
      await storageOperations.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove data for key ${key}:`, error);
      // Fail gracefully
    }
  };

  const clear = async (): Promise<void> => {
    try {
      await storageOperations.clear();
    } catch (error) {
      console.warn("Failed to clear storage:", error);
      // Fail gracefully
    }
  };

  const getAllKeys = async (): Promise<string[]> => {
    try {
      return await storageOperations.getAllKeys();
    } catch (error) {
      console.warn("Failed to get storage keys:", error);
      return [];
    }
  };

  return {
    save,
    load,
    remove,
    clear,
    getAllKeys,
  };
}