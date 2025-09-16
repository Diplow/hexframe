import type { StorageOperations } from "~/app/map/Cache/Services/storage/storage-operations";

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