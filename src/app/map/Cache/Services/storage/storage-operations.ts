// Storage operation types and implementations
export interface StorageOperations {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
  getAllKeys: () => Promise<string[]>;
}

// Re-export implementations
export { createBrowserStorageOperations } from "~/app/map/Cache/Services/storage/browser-storage";
export { createSSRStorageOperations } from "~/app/map/Cache/Services/storage/ssr-storage";
export { createMockStorageOperations } from "~/app/map/Cache/Services/storage/mock-storage";