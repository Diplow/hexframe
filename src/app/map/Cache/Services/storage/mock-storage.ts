import type { StorageOperations } from "~/app/map/Cache/Services/storage/storage-operations";

// Mock storage operations for testing
export const createMockStorageOperations = (
  initialData: Record<string, string> = {}
): StorageOperations => {
  const storage = new Map(Object.entries(initialData));

  return {
    getItem: async (key: string) => storage.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: async (key: string) => {
      storage.delete(key);
    },
    clear: async () => {
      storage.clear();
    },
    getAllKeys: async () => Array.from(storage.keys()),
  };
};