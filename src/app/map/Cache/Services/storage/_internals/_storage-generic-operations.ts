import type { StorageOperations } from "~/app/map/Cache/Services/storage/storage-operations";
import { _createMetadata, CURRENT_STORAGE_VERSION, type StorageEnvelope } from "~/app/map/Cache/Services/storage/_internals/_storage-metadata";

/**
 * Creates generic storage operations (save, load, remove, clear, getAllKeys, isAvailable)
 */
export function _createGenericOperations(storageOperations: StorageOperations) {
  const save = async (key: string, data: unknown): Promise<void> => {
    try {
      const metadata = _createMetadata();
      const envelope: StorageEnvelope = {
        metadata,
        data,
      };
      const serializedData: string = JSON.stringify(envelope);

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

      const parsed: StorageEnvelope<T> = JSON.parse(serializedData) as StorageEnvelope<T>;

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

  const isAvailable = async (): Promise<boolean> => {
    try {
      const testKey = 'test-availability';
      await storageOperations.setItem(testKey, 'test');
      await storageOperations.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  };

  return {
    save,
    load,
    remove,
    clear,
    getAllKeys,
    isAvailable,
  };
}
