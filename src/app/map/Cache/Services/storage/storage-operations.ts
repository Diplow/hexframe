// Storage operation types and implementations
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