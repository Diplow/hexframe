import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createStorageService,
  createBrowserStorageService,
  createSSRStorageService,
  createMockStorageService,
  createNoOpStorageService,
  createBrowserStorageOperations,
  createSSRStorageOperations,
  createMockStorageOperations,
  STORAGE_KEYS,
} from "~/app/map/Cache/Services/storage-service";
import type { StorageOperations } from "~/app/map/Cache/Services/storage-service";

// Mock console.warn to avoid noise in tests
const mockConsoleWarn = vi.fn();
console.warn = mockConsoleWarn;

describe("Storage Service", () => {
  let mockStorageOperations: StorageOperations;

  beforeEach(() => {
    mockStorageOperations = {
      getItem: vi.fn().mockResolvedValue(null),
      setItem: vi.fn().mockResolvedValue(undefined),
      removeItem: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      getAllKeys: vi.fn().mockResolvedValue([]),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Storage Operations Implementations", () => {
    describe("createBrowserStorageOperations", () => {
      test("returns browser storage operations with localStorage access", () => {
        const operations = createBrowserStorageOperations();

        expect(operations).toHaveProperty("getItem");
        expect(operations).toHaveProperty("setItem");
        expect(operations).toHaveProperty("removeItem");
        expect(operations).toHaveProperty("clear");
        expect(operations).toHaveProperty("getAllKeys");

        expect(typeof operations.getItem).toBe("function");
        expect(typeof operations.setItem).toBe("function");
        expect(typeof operations.removeItem).toBe("function");
        expect(typeof operations.clear).toBe("function");
        expect(typeof operations.getAllKeys).toBe("function");
      });

      test("handles SSR environment gracefully", async () => {
        // Temporarily mock window as undefined to simulate SSR
        const originalWindow = globalThis.window;
        Object.defineProperty(globalThis, "window", {
          value: undefined,
          configurable: true,
        });

        const operations = createBrowserStorageOperations();

        // Should handle missing window gracefully
        const result = await operations.getItem("test");
        expect(result).toBeNull();

        // Should not throw
        await expect(
          operations.setItem("test", "value"),
        ).resolves.toBeUndefined();
        await expect(operations.removeItem("test")).resolves.toBeUndefined();
        await expect(operations.clear()).resolves.toBeUndefined();
        const keys = await operations.getAllKeys();
        expect(keys).toEqual([]);

        // Restore window
        Object.defineProperty(globalThis, "window", {
          value: originalWindow,
          configurable: true,
        });
      });
    });

    describe("createSSRStorageOperations", () => {
      test("returns SSR-safe storage operations", async () => {
        const operations = createSSRStorageOperations();

        const result = await operations.getItem("test");
        expect(result).toBeNull();

        // Should be no-ops
        await expect(
          operations.setItem("test", "value"),
        ).resolves.toBeUndefined();
        await expect(operations.removeItem("test")).resolves.toBeUndefined();
        await expect(operations.clear()).resolves.toBeUndefined();

        const keys = await operations.getAllKeys();
        expect(keys).toEqual([]);
      });
    });

    describe("createMockStorageOperations", () => {
      test("returns default mock operations", async () => {
        const operations = createMockStorageOperations();

        const result = await operations.getItem("test");
        expect(result).toBeNull();

        await operations.setItem("test", "value");
        const retrieved = await operations.getItem("test");
        expect(retrieved).toBe("value");
      });

      test("uses provided mock data", async () => {
        const mockData = { existingKey: "existingValue" };
        const operations = createMockStorageOperations(mockData);

        const result = await operations.getItem("existingKey");
        expect(result).toBe("existingValue");

        await operations.setItem("newKey", "newValue");
        const newResult = await operations.getItem("newKey");
        expect(newResult).toBe("newValue");
      });

      test("supports all operations correctly", async () => {
        const operations = createMockStorageOperations({
          key1: "value1",
          key2: "value2",
        });

        // Test getAllKeys
        const keys = await operations.getAllKeys();
        expect(keys).toEqual(["key1", "key2"]);

        // Test removeItem
        await operations.removeItem("key1");
        const result = await operations.getItem("key1");
        expect(result).toBeNull();

        // Test clear
        await operations.clear();
        const keysAfterClear = await operations.getAllKeys();
        expect(keysAfterClear).toEqual([]);
      });
    });
  });

  describe("createStorageService", () => {
    test("creates service with all expected methods", () => {
      const service = createStorageService(mockStorageOperations);

      expect(service).toHaveProperty("save");
      expect(service).toHaveProperty("load");
      expect(service).toHaveProperty("remove");
      expect(service).toHaveProperty("clear");
      expect(service).toHaveProperty("saveCacheData");
      expect(service).toHaveProperty("loadCacheData");
      expect(service).toHaveProperty("saveUserPreferences");
      expect(service).toHaveProperty("loadUserPreferences");
      expect(service).toHaveProperty("saveExpandedItems");
      expect(service).toHaveProperty("loadExpandedItems");
      expect(service).toHaveProperty("isAvailable");

      expect(typeof service.save).toBe("function");
      expect(typeof service.load).toBe("function");
      expect(typeof service.remove).toBe("function");
      expect(typeof service.clear).toBe("function");
    });

    describe("save and load operations", () => {
      test("saves and loads data with metadata", async () => {
        const testData = { test: "value", nested: { object: true } };
        const service = createStorageService(mockStorageOperations);

        await service.save("testKey", testData);

        expect(mockStorageOperations.setItem).toHaveBeenCalledWith(
          "testKey",
          expect.stringContaining('"test":"value"'),
        );

        // Mock the load operation
        const serializedData = JSON.stringify({
          metadata: { version: 1, timestamp: Date.now() },
          data: testData,
        });
        mockStorageOperations.getItem = vi
          .fn()
          .mockResolvedValue(serializedData);

        const loadedData = await service.load("testKey");
        expect(loadedData).toEqual(testData);
      });

      test("handles missing data gracefully", async () => {
        mockStorageOperations.getItem = vi.fn().mockResolvedValue(null);
        const service = createStorageService(mockStorageOperations);

        const result = await service.load("missingKey");
        expect(result).toBeNull();
      });

      test("handles version mismatch gracefully", async () => {
        const service = createStorageService(mockStorageOperations);
        const oldVersionData = JSON.stringify({
          metadata: { version: 0, timestamp: Date.now() },
          data: { test: "value" },
        });

        mockStorageOperations.getItem = vi
          .fn()
          .mockResolvedValue(oldVersionData);

        const result = await service.load("testKey");
        expect(result).toBeNull();
        expect(mockConsoleWarn).toHaveBeenCalledWith(
          "Storage version mismatch for key testKey. Expected 1, got 0",
        );
      });

      test("handles corrupted data gracefully", async () => {
        mockStorageOperations.getItem = vi
          .fn()
          .mockResolvedValue("invalid json");
        const service = createStorageService(mockStorageOperations);

        const result = await service.load("testKey");
        expect(result).toBeNull();
        expect(mockConsoleWarn).toHaveBeenCalledWith(
          expect.stringContaining("Failed to load data"),
          expect.anything(),
        );
      });

      test("handles storage operation errors gracefully", async () => {
        const errorOperations: StorageOperations = {
          getItem: vi.fn().mockRejectedValue(new Error("Storage error")),
          setItem: vi.fn().mockRejectedValue(new Error("Storage error")),
          removeItem: vi.fn().mockRejectedValue(new Error("Storage error")),
          clear: vi.fn().mockRejectedValue(new Error("Storage error")),
          getAllKeys: vi.fn().mockRejectedValue(new Error("Storage error")),
        };

        const service = createStorageService(errorOperations);

        // Should not throw errors
        await expect(
          service.save("test", { data: "value" }),
        ).resolves.toBeUndefined();
        await expect(service.load("test")).resolves.toBeNull();
        await expect(service.remove("test")).resolves.toBeUndefined();
        await expect(service.clear()).resolves.toBeUndefined();
      });
    });

    describe("cache-specific operations", () => {
      test("saveCacheData and loadCacheData work correctly", async () => {
        const cacheData = { items: {}, metadata: {} };
        const service = createStorageService(mockStorageOperations);

        await service.saveCacheData(cacheData);

        expect(mockStorageOperations.setItem).toHaveBeenCalledWith(
          STORAGE_KEYS.CACHE_DATA,
          expect.stringContaining('"items"'),
        );

        // Mock successful load
        const serializedData = JSON.stringify({
          metadata: { version: 1, timestamp: Date.now() },
          data: cacheData,
        });
        mockStorageOperations.getItem = vi
          .fn()
          .mockResolvedValue(serializedData);

        const loaded = await service.loadCacheData();
        expect(loaded).toEqual(cacheData);
      });

      test("saveUserPreferences and loadUserPreferences work correctly", async () => {
        const preferences = { theme: "dark", autoSave: true };
        const service = createStorageService(mockStorageOperations);

        await service.saveUserPreferences(preferences);

        expect(mockStorageOperations.setItem).toHaveBeenCalledWith(
          STORAGE_KEYS.USER_PREFERENCES,
          expect.stringContaining('"theme":"dark"'),
        );
      });

      test("saveExpandedItems and loadExpandedItems work correctly", async () => {
        const expandedItems = ["item1", "item2", "item3"];
        const service = createStorageService(mockStorageOperations);

        await service.saveExpandedItems(expandedItems);

        expect(mockStorageOperations.setItem).toHaveBeenCalledWith(
          STORAGE_KEYS.EXPANDED_ITEMS,
          expect.stringContaining('"item1"'),
        );

        // Mock successful load
        const serializedData = JSON.stringify({
          metadata: { version: 1, timestamp: Date.now() },
          data: expandedItems,
        });
        mockStorageOperations.getItem = vi
          .fn()
          .mockResolvedValue(serializedData);

        const loaded = await service.loadExpandedItems();
        expect(loaded).toEqual(expandedItems);
      });

      test("loadExpandedItems returns empty array for missing data", async () => {
        mockStorageOperations.getItem = vi.fn().mockResolvedValue(null);
        const service = createStorageService(mockStorageOperations);

        const result = await service.loadExpandedItems();
        expect(result).toEqual([]);
      });

      test("loadExpandedItems returns empty array for invalid data", async () => {
        const serializedData = JSON.stringify({
          metadata: { version: 1, timestamp: Date.now() },
          data: "not an array",
        });
        mockStorageOperations.getItem = vi
          .fn()
          .mockResolvedValue(serializedData);
        const service = createStorageService(mockStorageOperations);

        const result = await service.loadExpandedItems();
        expect(result).toEqual([]);
      });
    });

    describe("isAvailable health check", () => {
      test("returns true when storage works correctly", async () => {
        const workingOperations = createMockStorageOperations();
        const service = createStorageService(workingOperations);

        const isAvailable = await service.isAvailable();
        expect(isAvailable).toBe(true);
      });

      test("returns false when storage operations fail", async () => {
        const brokenOperations: StorageOperations = {
          getItem: vi
            .fn()
            .mockRejectedValue(new Error("Storage not available")),
          setItem: vi
            .fn()
            .mockRejectedValue(new Error("Storage not available")),
          removeItem: vi
            .fn()
            .mockRejectedValue(new Error("Storage not available")),
          clear: vi.fn().mockRejectedValue(new Error("Storage not available")),
          getAllKeys: vi
            .fn()
            .mockRejectedValue(new Error("Storage not available")),
        };

        const service = createStorageService(brokenOperations);

        const isAvailable = await service.isAvailable();
        expect(isAvailable).toBe(false);
      });
    });
  });

  describe("Service Factories", () => {
    test("createBrowserStorageService creates browser service", () => {
      const service = createBrowserStorageService();

      expect(service).toHaveProperty("save");
      expect(service).toHaveProperty("load");
      expect(service).toHaveProperty("isAvailable");
    });

    test("createSSRStorageService creates SSR service", async () => {
      const service = createSSRStorageService();

      expect(service).toHaveProperty("save");
      expect(service).toHaveProperty("load");

      // Should be no-op operations
      await service.save("test", { data: "value" });
      const result = await service.load("test");
      expect(result).toBeNull();
    });

    test("createMockStorageService creates mock service", async () => {
      const mockData = {
        testKey: JSON.stringify({
          metadata: { version: 1 },
          data: "testValue",
        }),
      };
      const service = createMockStorageService(mockData);

      const result = await service.load("testKey");
      expect(result).toBe("testValue");
    });

    test("createNoOpStorageService creates no-op service", async () => {
      const service = createNoOpStorageService();

      await service.save("test", { data: "value" });
      const result = await service.load("test");
      expect(result).toBeNull();

      const isAvailable = await service.isAvailable();
      expect(isAvailable).toBe(false);
    });
  });

  describe("Configuration Support", () => {
    test("accepts service configuration", () => {
      const config = { enableRetry: false };

      // Should not throw with config
      expect(() =>
        createStorageService(mockStorageOperations, config),
      ).not.toThrow();
      expect(() => createBrowserStorageService(config)).not.toThrow();
      expect(() => createSSRStorageService(config)).not.toThrow();
      expect(() => createMockStorageService({}, config)).not.toThrow();
    });
  });

  describe("Storage Keys", () => {
    test("STORAGE_KEYS contains expected keys", () => {
      expect(STORAGE_KEYS).toHaveProperty("CACHE_DATA");
      expect(STORAGE_KEYS).toHaveProperty("CACHE_METADATA");
      expect(STORAGE_KEYS).toHaveProperty("USER_PREFERENCES");
      expect(STORAGE_KEYS).toHaveProperty("EXPANDED_ITEMS");

      expect(STORAGE_KEYS.CACHE_DATA).toBe("mapCache:data");
      expect(STORAGE_KEYS.CACHE_METADATA).toBe("mapCache:metadata");
      expect(STORAGE_KEYS.USER_PREFERENCES).toBe("mapCache:preferences");
      expect(STORAGE_KEYS.EXPANDED_ITEMS).toBe("mapCache:expandedItems");
    });
  });

  describe("Edge Cases", () => {
    test("handles undefined data gracefully", async () => {
      const service = createStorageService(mockStorageOperations);

      await service.save("test", undefined);
      expect(mockStorageOperations.setItem).toHaveBeenCalled();
    });

    test("handles null data gracefully", async () => {
      const service = createStorageService(mockStorageOperations);

      await service.save("test", null);
      expect(mockStorageOperations.setItem).toHaveBeenCalled();
    });

    test("handles circular references in data", async () => {
      const service = createStorageService(mockStorageOperations);
      const circularData: Record<string, unknown> = { name: "test" };
      circularData.self = circularData;

      // Should handle JSON.stringify error gracefully
      await service.save("test", circularData);
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining("Failed to save data"),
        expect.anything(),
      );
    });

    test("handles very large data gracefully", async () => {
      const service = createStorageService(mockStorageOperations);
      const largeData = {
        items: new Array(10000).fill({ id: "test", data: "large data item" }),
      };

      await service.save("large", largeData);
      expect(mockStorageOperations.setItem).toHaveBeenCalled();
    });
  });
});
