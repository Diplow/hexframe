import type { StorageOperations } from "~/app/map/Cache/Services/storage/storage-operations";

// SSR-safe storage operations (no-op implementation)
export const createSSRStorageOperations = (): StorageOperations => ({
  getItem: async () => null,
  setItem: async () => {
    // No-op for SSR environments
  },
  removeItem: async () => {
    // No-op for SSR environments
  },
  clear: async () => {
    // No-op for SSR environments
  },
  getAllKeys: async () => [],
});