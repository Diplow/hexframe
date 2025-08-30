import type { StorageService, ServiceConfig } from "~/app/map/Cache/Services/types";

// Storage key utilities
export const STORAGE_KEYS = {
  CACHE_DATA: "mapCache:data",
  CACHE_METADATA: "mapCache:metadata",
  USER_PREFERENCES: "mapCache:preferences",
  EXPANDED_ITEMS: "mapCache:expandedItems",
} as const;

// Storage operation types for better type safety
export interface StorageOperations {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
  getAllKeys: () => Promise<string[]>;
}

// Browser localStorage implementation
export const createBrowserStorageOperations = (): StorageOperations => ({
  getItem: async (key: string) => {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      console.warn("Failed to get item from localStorage:", error);
      return null;
    }
  },

  setItem: async (key: string, value: string) => {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      console.warn("Failed to set item in localStorage:", error);
    }
  },

  removeItem: async (key: string) => {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn("Failed to remove item from localStorage:", error);
    }
  },

  clear: async () => {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.clear();
    } catch (error) {
      console.warn("Failed to clear localStorage:", error);
    }
  },

  getAllKeys: async () => {
    if (typeof window === "undefined" || !window.localStorage) {
      return [];
    }
    try {
      return Object.keys(window.localStorage);
    } catch (error) {
      console.warn("Failed to get keys from localStorage:", error);
      return [];
    }
  },
});

// SSR-safe implementation (no-op)
export const createSSRStorageOperations = (): StorageOperations => ({
  getItem: async () => null,
  setItem: async () => {
    // No-op for SSR
  },
  removeItem: async () => {
    // No-op for SSR
  },
  clear: async () => {
    // No-op for SSR
  },
  getAllKeys: async () => [],
});

// Mock implementation for testing
export const createMockStorageOperations = (
  mockData: Record<string, string> = {},
): StorageOperations => {
  const storage = { ...mockData };

  return {
    getItem: async (key: string) => storage[key] ?? null,
    setItem: async (key: string, value: string) => {
      storage[key] = value;
    },
    removeItem: async (key: string) => {
      delete storage[key];
    },
    clear: async () => {
      Object.keys(storage).forEach((key) => delete storage[key]);
    },
    getAllKeys: async () => Object.keys(storage),
  };
};

// Storage data versioning for future migrations
interface StorageMetadata {
  version: number;
  timestamp: number;
  userAgent?: string;
}

interface StorageEnvelope<T = unknown> {
  metadata?: StorageMetadata;
  data: T;
}

const CURRENT_STORAGE_VERSION = 1;

/**
 * Storage Service for persisting cache data
 * Currently implemented as no-op but designed for future enhancement
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
        // In the future, this would trigger migration logic
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
    }
  };

  const clear = async (): Promise<void> => {
    try {
      await storageOperations.clear();
    } catch (error) {
      console.warn("Failed to clear storage:", error);
    }
  };

  // Future enhancement: cache-specific operations
  const saveCacheData = async (cacheData: unknown): Promise<void> => {
    await save(STORAGE_KEYS.CACHE_DATA, cacheData);
  };

  const loadCacheData = async (): Promise<unknown> => {
    return load(STORAGE_KEYS.CACHE_DATA);
  };

  const saveUserPreferences = async (preferences: unknown): Promise<void> => {
    await save(STORAGE_KEYS.USER_PREFERENCES, preferences);
  };

  const loadUserPreferences = async (): Promise<unknown> => {
    return load(STORAGE_KEYS.USER_PREFERENCES);
  };

  const saveExpandedItems = async (expandedItems: string[]): Promise<void> => {
    await save(STORAGE_KEYS.EXPANDED_ITEMS, expandedItems);
  };

  const loadExpandedItems = async (): Promise<string[]> => {
    const items = await load<string[]>(STORAGE_KEYS.EXPANDED_ITEMS);
    return Array.isArray(items) ? items : [];
  };

  // Health check for storage availability
  const isAvailable = async (): Promise<boolean> => {
    try {
      const testKey = "__storage_test__";
      const testValue = "test";
      await storageOperations.setItem(testKey, testValue);
      const retrieved = await storageOperations.getItem(testKey);
      await storageOperations.removeItem(testKey);
      return retrieved === testValue;
    } catch {
      return false;
    }
  };

  return {
    save,
    load,
    remove,
    clear,
    saveCacheData,
    loadCacheData,
    saveUserPreferences,
    loadUserPreferences,
    saveExpandedItems,
    loadExpandedItems,
    isAvailable,
  };
}

/**
 * Hook for using storage service in React components
 * Automatically detects environment (browser vs SSR)
 */
export function useStorageService(config: ServiceConfig = {}): StorageService {
  const storageOperations =
    typeof window === "undefined"
      ? createSSRStorageOperations()
      : createBrowserStorageOperations();

  return createStorageService(storageOperations, config);
}

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

// No-op storage service for environments that don't support persistence
export function createNoOpStorageService(): StorageService {
  return createStorageService(createSSRStorageOperations());
}
