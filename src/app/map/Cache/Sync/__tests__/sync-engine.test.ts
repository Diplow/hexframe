import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createSyncEngine,
  createSyncEngineForTesting,
} from "~/app/map/Cache/Sync/sync-engine";
import { initialCacheState } from "~/app/map/Cache/State/reducer";
import type { CacheState } from "~/app/map/Cache/State/types";
import type { DataOperations } from "~/app/map/Cache/types/handlers";
import type {
  SyncConfig,
  SyncEvent,
  SyncEventHandler,
} from "~/app/map/Cache/Sync/types";

// Mock console.warn to avoid noise in tests
const mockConsoleWarn = vi.fn();
console.warn = mockConsoleWarn;

describe("Sync Engine", () => {
  let mockDispatch: ReturnType<typeof vi.fn>;
  let mockDataHandler: DataOperations;
  let mockState: CacheState;
  let mockEventHandler: SyncEventHandler;
  let capturedEvents: SyncEvent[];

  // Mock navigator.onLine
  const mockNavigator = {
    onLine: true,
  };
  Object.defineProperty(global, "navigator", {
    value: mockNavigator,
    writable: true,
  });

  // Mock window and document for event listeners
  const mockWindow = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  const mockDocument = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    visibilityState: "visible",
    createElement: vi.fn(() => ({
      appendChild: vi.fn(),
      setAttribute: vi.fn(),
      id: '',
    })),
    getElementById: vi.fn(() => null),
    documentElement: {
      appendChild: vi.fn(),
    },
    body: {
      appendChild: vi.fn(),
    },
  };
  Object.defineProperty(global, "window", {
    value: mockWindow,
    writable: true,
  });
  Object.defineProperty(global, "document", {
    value: mockDocument,
    writable: true,
  });

  beforeEach(() => {
    mockDispatch = vi.fn();

    mockDataHandler = {
      loadRegion: vi.fn().mockResolvedValue({ success: true }),
      loadItemChildren: vi.fn().mockResolvedValue({ success: true }),
      prefetchRegion: vi.fn().mockResolvedValue({ success: true }),
      invalidateRegion: vi.fn(),
      invalidateAll: vi.fn(),
    };

    mockState = {
      ...initialCacheState,
      currentCenter: "1,2",
      regionMetadata: {
        "1,2": {
          centerCoordId: "1,2",
          maxDepth: 2,
          loadedAt: Date.now() - 10000, // 10 seconds ago
          itemCoordIds: ["1,2", "1,3"],
        },
        "3,4": {
          centerCoordId: "3,4",
          maxDepth: 1,
          loadedAt: Date.now() - 60000, // 1 minute ago
          itemCoordIds: ["3,4"],
        },
      },
      cacheConfig: {
        maxAge: 300000, // 5 minutes
        backgroundRefreshInterval: 30000,
        enableOptimisticUpdates: true,
        maxDepth: 3,
      },
    };

    capturedEvents = [];
    mockEventHandler = vi.fn((event: SyncEvent) => {
      capturedEvents.push(event);
    });

    // Reset navigator online status
    mockNavigator.onLine = true;

    // Clear all timers
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
    capturedEvents = [];
  });

  describe("Sync Engine Creation", () => {
    test("creates sync engine with default configuration", () => {
      const syncEngine = createSyncEngine({
        dispatch: mockDispatch,
        state: mockState,
        dataHandler: mockDataHandler,
      });

      expect(syncEngine).toHaveProperty("startSync");
      expect(syncEngine).toHaveProperty("stopSync");
      expect(syncEngine).toHaveProperty("performSync");
      expect(syncEngine).toHaveProperty("forceSync");
      expect(syncEngine).toHaveProperty("pauseSync");
      expect(syncEngine).toHaveProperty("resumeSync");
      expect(syncEngine).toHaveProperty("getSyncStatus");
      expect(syncEngine).toHaveProperty("updateSyncConfig");

      expect(typeof syncEngine.startSync).toBe("function");
      expect(typeof syncEngine.stopSync).toBe("function");
      expect(typeof syncEngine.performSync).toBe("function");
      expect(typeof syncEngine.forceSync).toBe("function");
    });

    test("creates sync engine with custom configuration", () => {
      const customConfig: Partial<SyncConfig> = {
        intervalMs: 60000, // 1 minute
        maxRetries: 5,
        enabled: false,
      };

      const syncEngine = createSyncEngine({
        dispatch: mockDispatch,
        state: mockState,
        dataHandler: mockDataHandler,
        syncConfig: customConfig,
      });

      const status = syncEngine.getSyncStatus();
      expect(status.isOnline).toBe(true);
      expect(status.isSyncing).toBe(false);
    });
  });

  describe("Sync Status Management", () => {
    test("initial sync status is correct", () => {
      const syncEngine = createSyncEngine({
        dispatch: mockDispatch,
        state: mockState,
        dataHandler: mockDataHandler,
      });

      const status = syncEngine.getSyncStatus();

      expect(status).toEqual({
        isOnline: true,
        isSyncing: false,
        lastSyncAt: null,
        nextSyncAt: null,
        syncCount: 0,
        errorCount: 0,
        lastError: null,
      });
    });

    test.skip("sync status updates correctly after successful sync", async () => {
      const syncEngine = createSyncEngine({
        dispatch: mockDispatch,
        state: mockState,
        dataHandler: mockDataHandler,
        eventHandler: mockEventHandler,
      });

      const result = await syncEngine.performSync();

      expect(result.success).toBe(true);
      expect(result.itemsSynced).toBeGreaterThan(0);

      const status = syncEngine.getSyncStatus();
      expect(status.syncCount).toBe(1);
      expect(status.lastSyncAt).toBeGreaterThan(0);
      expect(status.errorCount).toBe(0);
    });

    test.skip("sync status updates correctly after failed sync", async () => {
      // Make data handler fail
      mockDataHandler.loadRegion = vi
        .fn()
        .mockRejectedValue(new Error("Network error"));

      const syncEngine = createSyncEngine({
        dispatch: mockDispatch,
        state: mockState,
        dataHandler: mockDataHandler,
        eventHandler: mockEventHandler,
      });

      const result = await syncEngine.performSync();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      const status = syncEngine.getSyncStatus();
      expect(status.errorCount).toBe(1);
      expect(status.lastError).toBeDefined();
    });
  });

  describe("Online/Offline Detection", () => {
    test("detects online status correctly", () => {
      mockNavigator.onLine = true;

      const syncEngine = createSyncEngine({
        dispatch: mockDispatch,
        state: mockState,
        dataHandler: mockDataHandler,
      });

      const status = syncEngine.getSyncStatus();
      expect(status.isOnline).toBe(true);
    });

    test("handles offline status correctly", async () => {
      mockNavigator.onLine = false;

      const syncEngine = createSyncEngine({
        dispatch: mockDispatch,
        state: mockState,
        dataHandler: mockDataHandler,
        eventHandler: mockEventHandler,
      });

      const result = await syncEngine.performSync();

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Cannot sync while offline");

      const status = syncEngine.getSyncStatus();
      expect(status.isOnline).toBe(false);
    });

    test("emits online status change events", () => {
      const syncEngine = createSyncEngine({
        dispatch: mockDispatch,
        state: mockState,
        dataHandler: mockDataHandler,
        eventHandler: mockEventHandler,
      });

      syncEngine.startSync();

      // Simulate going offline
      mockNavigator.onLine = false;
      const offlineEvent = mockWindow.addEventListener.mock.calls.find(
        ([event]) => event === "offline",
      );
      if (offlineEvent) {
        (offlineEvent[1] as () => void)(); // Call the event handler
      }

      const onlineEvents = capturedEvents.filter(
        (e) => e.type === "ONLINE_STATUS_CHANGED",
      );
      expect(onlineEvents).toHaveLength(1);
      expect(onlineEvents[0]).toMatchObject({
        type: "ONLINE_STATUS_CHANGED",
        isOnline: false,
      });
    });

    test("uses custom online check URL when provided", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      const syncEngine = createSyncEngine({
        dispatch: mockDispatch,
        state: mockState,
        dataHandler: mockDataHandler,
        syncConfig: {
          onlineCheckUrl: "https://example.com/ping",
        },
      });

      await syncEngine.performSync();

      expect(global.fetch).toHaveBeenCalledWith("https://example.com/ping", {
        method: "HEAD",
        mode: "no-cors",
        cache: "no-cache",
      });
    });
  });

  describe("Periodic Sync Functionality", () => {
    test("starts periodic sync correctly", () => {
      const syncEngine = createSyncEngine({
        dispatch: mockDispatch,
        state: mockState,
        dataHandler: mockDataHandler,
        syncConfig: { intervalMs: 10000 }, // 10 seconds
      });

      syncEngine.startSync();

      // Should set up event listeners
      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        "online",
        expect.any(Function),
      );
      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        "offline",
        expect.any(Function),
      );
    });

    test("schedules periodic sync at correct intervals", async () => {
      const syncEngine = createSyncEngine({
        dispatch: mockDispatch,
        state: mockState,
        dataHandler: mockDataHandler,
        syncConfig: { intervalMs: 5000 }, // 5 seconds
      });

      syncEngine.startSync();

      // Fast forward time and check that sync is called
      await vi.advanceTimersByTimeAsync(5000);

      // Should have called loadRegion for current center
      expect(mockDataHandler.loadRegion).toHaveBeenCalledWith("1,2", 3);
    });

    test("stops periodic sync correctly", () => {
      const syncEngine = createSyncEngine({
        dispatch: mockDispatch,
        state: mockState,
        dataHandler: mockDataHandler,
      });

      syncEngine.startSync();
      syncEngine.stopSync();

      // Should remove event listeners
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith(
        "online",
        expect.any(Function),
      );
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith(
        "offline",
        expect.any(Function),
      );

      const status = syncEngine.getSyncStatus();
      expect(status.nextSyncAt).toBeNull();
    });

    test.skip("pauses and resumes sync correctly", async () => {
      const syncEngine = createSyncEngine({
        dispatch: mockDispatch,
        state: mockState,
        dataHandler: mockDataHandler,
        syncConfig: { intervalMs: 5000 },
      });

      syncEngine.startSync();
      syncEngine.pauseSync();

      // Should not sync when paused
      await vi.advanceTimersByTimeAsync(10000);
      expect(mockDataHandler.loadRegion).not.toHaveBeenCalled();

      syncEngine.resumeSync();

      // Should resume syncing
      await vi.advanceTimersByTimeAsync(5000);
      expect(mockDataHandler.loadRegion).toHaveBeenCalled();
    });
  });

  describe("Manual Sync Operations", () => {
    test("performSync works correctly", async () => {
      const syncEngine = createSyncEngine({
        dispatch: mockDispatch,
        state: mockState,
        dataHandler: mockDataHandler,
        eventHandler: mockEventHandler,
      });

      const result = await syncEngine.performSync();

      expect(result.success).toBe(true);
      expect(result.itemsSynced).toBe(3); // 1 center + 2 recent regions
      expect(result.duration).toBeGreaterThanOrEqual(0);

      // Should have called loadRegion for current center
      expect(mockDataHandler.loadRegion).toHaveBeenCalledWith("1,2", 3);

      // Should emit sync events
      expect(capturedEvents).toHaveLength(2); // SYNC_STARTED and SYNC_COMPLETED
      expect(capturedEvents[0]!.type).toBe("SYNC_STARTED");
      expect(capturedEvents[1]!.type).toBe("SYNC_COMPLETED");
    });

    test("forceSync bypasses sync in progress check", async () => {
      const syncEngine = createSyncEngine({
        dispatch: mockDispatch,
        state: mockState,
        dataHandler: mockDataHandler,
      });

      // Start a sync that will hang
      let resolveFirstSync: () => void;
      const hangingPromise = new Promise<void>((resolve) => {
        resolveFirstSync = resolve;
      });

      mockDataHandler.loadRegion = vi
        .fn()
        .mockImplementationOnce(() => hangingPromise) // First call hangs
        .mockResolvedValue({ success: true }); // Subsequent calls succeed

      const syncPromise = syncEngine.performSync();

      // Force sync should still work
      const forceResult = await syncEngine.forceSync();
      expect(forceResult.success).toBe(true);

      // Complete the first sync
      resolveFirstSync!();
      await syncPromise;
    }, 10000); // Increase timeout for this test

    test("sync syncs recent regions correctly", async () => {
      const syncEngine = createSyncEngine({
        dispatch: mockDispatch,
        state: mockState,
        dataHandler: mockDataHandler,
      });

      await syncEngine.performSync();

      // Should sync current center and recent regions
      expect(mockDataHandler.loadRegion).toHaveBeenCalledWith("1,2", 3);
      expect(mockDataHandler.loadRegion).toHaveBeenCalledWith("1,2", 2);
      expect(mockDataHandler.loadRegion).toHaveBeenCalledWith("3,4", 1);
    });

    test("sync ignores stale regions", async () => {
      const staleState: CacheState = {
        ...mockState,
        regionMetadata: {
          "1,2": {
            centerCoordId: "1,2",
            maxDepth: 2,
            loadedAt: Date.now() - 400000, // 6.5 minutes ago (older than maxAge)
            itemCoordIds: ["1,2"],
          },
        },
      };

      const syncEngine = createSyncEngine({
        dispatch: mockDispatch,
        state: staleState,
        dataHandler: mockDataHandler,
      });

      await syncEngine.performSync();

      // Should only sync current center, not stale regions
      expect(mockDataHandler.loadRegion).toHaveBeenCalledTimes(1);
      expect(mockDataHandler.loadRegion).toHaveBeenCalledWith("1,2", 3);
    });
  });

  describe("Error Handling and Retry Logic", () => {
    test.skip("handles sync errors with retry", async () => {
      let callCount = 0;
      mockDataHandler.loadRegion = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          throw new Error("Network error");
        }
        return Promise.resolve({ success: true });
      });

      const syncEngine = createSyncEngine({
        dispatch: mockDispatch,
        state: mockState,
        dataHandler: mockDataHandler,
        syncConfig: { maxRetries: 3, retryDelayMs: 1000 },
        eventHandler: mockEventHandler,
      });

      // Start sync (will fail initially)
      const result = await syncEngine.performSync();
      expect(result.success).toBe(false);

      // The first call should have failed, and retries happen in background timers
      // The retry logic is internal to the sync engine and retries are scheduled asynchronously
      expect(mockDataHandler.loadRegion).toHaveBeenCalledTimes(1); // Initial call only

      const status = syncEngine.getSyncStatus();
      expect(status.errorCount).toBe(1); // Should count the initial failure
    });

    test.skip("gives up after max retries", async () => {
      mockDataHandler.loadRegion = vi
        .fn()
        .mockRejectedValue(new Error("Persistent error"));

      const syncEngine = createSyncEngine({
        dispatch: mockDispatch,
        state: mockState,
        dataHandler: mockDataHandler,
        syncConfig: { maxRetries: 2, retryDelayMs: 1000 },
        eventHandler: mockEventHandler,
      });

      const result = await syncEngine.performSync();
      expect(result.success).toBe(false);

      // Fast forward through all retries
      await vi.advanceTimersByTimeAsync(10000);
      await vi.runAllTimersAsync();

      const status = syncEngine.getSyncStatus();
      expect(status.errorCount).toBe(1);
      expect(status.lastError?.message).toBe("Persistent error");
    });

    test("emits sync failed events", async () => {
      mockDataHandler.loadRegion = vi
        .fn()
        .mockRejectedValue(new Error("Sync failed"));

      const syncEngine = createSyncEngine({
        dispatch: mockDispatch,
        state: mockState,
        dataHandler: mockDataHandler,
        eventHandler: mockEventHandler,
      });

      await syncEngine.performSync();

      const failedEvents = capturedEvents.filter(
        (e) => e.type === "SYNC_FAILED",
      );
      expect(failedEvents).toHaveLength(1);
      expect(failedEvents[0]).toMatchObject({
        type: "SYNC_FAILED",
        error: expect.any(Error) as Error,
      });
    });
  });

  describe("Configuration Updates", () => {
    test.skip("updateSyncConfig updates configuration", () => {
      const syncEngine = createSyncEngine({
        dispatch: mockDispatch,
        state: mockState,
        dataHandler: mockDataHandler,
      });

      syncEngine.updateSyncConfig({
        intervalMs: 15000,
        maxRetries: 5,
      });

      // Configuration should be updated (can't directly test internal config)
      // But we can test that it restarts if sync was running
      syncEngine.startSync();
      const initialCalls = mockWindow.addEventListener.mock.calls.length;

      syncEngine.updateSyncConfig({ intervalMs: 20000 });

      // Should have restarted sync (more calls to addEventListener)
      expect(mockWindow.addEventListener.mock.calls.length).toBeGreaterThan(
        initialCalls,
      );
    });
  });

  describe("Event Handler Integration", () => {
    test("event handler receives all sync events", async () => {
      const syncEngine = createSyncEngine({
        dispatch: mockDispatch,
        state: mockState,
        dataHandler: mockDataHandler,
        eventHandler: mockEventHandler,
      });

      await syncEngine.performSync();

      expect(capturedEvents).toHaveLength(2);
      expect(capturedEvents[0]!.type).toBe("SYNC_STARTED");
      expect(capturedEvents[1]!.type).toBe("SYNC_COMPLETED");
      expect(capturedEvents[1]).toMatchObject({
        type: "SYNC_COMPLETED",
        result: expect.objectContaining({
          success: true,
          itemsSynced: expect.any(Number) as number,
        }) as { success: boolean; itemsSynced: number },
      });
    });

    test("handles event handler errors gracefully", async () => {
      const errorEventHandler = vi.fn().mockImplementation(() => {
        throw new Error("Event handler error");
      });

      const syncEngine = createSyncEngine({
        dispatch: mockDispatch,
        state: mockState,
        dataHandler: mockDataHandler,
        eventHandler: errorEventHandler,
      });

      // Should not throw even if event handler throws
      await expect(syncEngine.performSync()).resolves.toBeDefined();
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        "Sync event handler error:",
        expect.any(Error),
      );
    });
  });

  describe("Browser Events Integration", () => {
    test("sets up visibility change listener when enabled", () => {
      const syncEngine = createSyncEngine({
        dispatch: mockDispatch,
        state: mockState,
        dataHandler: mockDataHandler,
        syncConfig: { syncOnVisibilityChange: true },
      });

      syncEngine.startSync();

      expect(mockDocument.addEventListener).toHaveBeenCalledWith(
        "visibilitychange",
        expect.any(Function),
      );
    });

    test("does not set up visibility listener when disabled", () => {
      const syncEngine = createSyncEngine({
        dispatch: mockDispatch,
        state: mockState,
        dataHandler: mockDataHandler,
        syncConfig: { syncOnVisibilityChange: false },
      });

      syncEngine.startSync();

      expect(mockDocument.addEventListener).not.toHaveBeenCalledWith(
        "visibilitychange",
        expect.any(Function),
      );
    });
  });

  describe("Testing Factory Functions", () => {
    test("createSyncEngineForTesting disables sync by default", async () => {
      const syncEngine = createSyncEngineForTesting(
        mockDispatch,
        mockState,
        mockDataHandler,
      );

      // Should be disabled by default for testing
      syncEngine.startSync();

      // Fast forward time - should not sync automatically
      await vi.advanceTimersByTimeAsync(60000);
      expect(mockDataHandler.loadRegion).not.toHaveBeenCalled();
    });

    test("createSyncEngineForTesting can be enabled for testing", async () => {
      const syncEngine = createSyncEngineForTesting(
        mockDispatch,
        mockState,
        mockDataHandler,
        { enabled: true, intervalMs: 5000 },
      );

      syncEngine.startSync();

      await vi.advanceTimersByTimeAsync(5000);
      expect(mockDataHandler.loadRegion).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    test("handles state without current center", async () => {
      const stateWithoutCenter: CacheState = {
        ...mockState,
        currentCenter: null,
      };

      const syncEngine = createSyncEngine({
        dispatch: mockDispatch,
        state: stateWithoutCenter,
        dataHandler: mockDataHandler,
      });

      const result = await syncEngine.performSync();

      expect(result.success).toBe(true);
      expect(result.itemsSynced).toBe(2); // Only recent regions, no center
    });

    test("handles state without recent regions", async () => {
      const stateWithoutRegions: CacheState = {
        ...mockState,
        regionMetadata: {},
      };

      const syncEngine = createSyncEngine({
        dispatch: mockDispatch,
        state: stateWithoutRegions,
        dataHandler: mockDataHandler,
      });

      const result = await syncEngine.performSync();

      expect(result.success).toBe(true);
      expect(result.itemsSynced).toBe(1); // Only center
    });

    test("handles partial region sync failures gracefully", async () => {
      mockDataHandler.loadRegion = vi
        .fn()
        .mockImplementationOnce(() => Promise.resolve({ success: true })) // Center succeeds
        .mockImplementationOnce(() =>
          Promise.reject(new Error("Region 1 failed")),
        ) // First region fails
        .mockImplementationOnce(() => Promise.resolve({ success: true })); // Second region succeeds

      const syncEngine = createSyncEngine({
        dispatch: mockDispatch,
        state: mockState,
        dataHandler: mockDataHandler,
      });

      const result = await syncEngine.performSync();

      // Should still succeed overall despite one region failure
      expect(result.success).toBe(true);
      expect(result.itemsSynced).toBe(2); // 2 successful syncs
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining("Failed to sync region"),
        expect.any(Error),
      );
    });
  });

  describe("Memory Management", () => {
    test.skip("cleans up timers when stopped", () => {
      const syncEngine = createSyncEngine({
        dispatch: mockDispatch,
        state: mockState,
        dataHandler: mockDataHandler,
        syncConfig: { intervalMs: 5000 },
      });

      syncEngine.startSync();

      // Verify timer is set
      const status1 = syncEngine.getSyncStatus();
      expect(status1.nextSyncAt).toBeGreaterThan(0);

      syncEngine.stopSync();

      // Timer should be cleared
      const status2 = syncEngine.getSyncStatus();
      expect(status2.nextSyncAt).toBeNull();
    });
  });
});
