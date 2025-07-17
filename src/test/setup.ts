import { afterEach, beforeEach, vi, expect } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { eventBusMatchers } from "~/test-utils/event-bus";

// Make React globally available for tests
if (typeof global !== 'undefined') {
  (global as unknown as { React: typeof React }).React = React;
}

// Set up environment variables for tests
// Use process.env.VITEST to detect if we're running in Vitest
if (process.env.VITEST) {
  // Set test database URL if not already set
  process.env.TEST_DATABASE_URL =
    process.env.TEST_DATABASE_URL ??
    "postgres://postgres:postgres@localhost:5432/test_db";

  // Log database connection for debugging
  console.log(`Using test database: ${process.env.TEST_DATABASE_URL}`);
}

// Ensure document is available for React testing
if (typeof document === 'undefined') {
  // This shouldn't happen with jsdom, but let's be safe
  throw new Error('Document is not available - jsdom may not be loaded correctly');
}

// Set up DOM environment for React testing
// This ensures that document and window are properly available

// Set up global DOM for all tests
if (typeof document !== 'undefined') {
  // Ensure document.body exists
  if (!document.body) {
    document.body = document.createElement('body');
  }
}


if (typeof window !== "undefined") {
  // Add any missing DOM APIs that tests might need
  if (!window.matchMedia) {
    window.matchMedia = (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => { /* deprecated */ },
      removeListener: () => { /* deprecated */ },
      addEventListener: () => { /* noop */ },
      removeEventListener: () => { /* noop */ },
      dispatchEvent: () => true,
    });
  }

  // Mock IntersectionObserver if not available
  if (!window.IntersectionObserver) {
    window.IntersectionObserver = class IntersectionObserver {
      readonly root = null;
      readonly rootMargin = "0px";
      readonly thresholds: readonly number[] = [];
      observe() { /* noop */ }
      unobserve() { /* noop */ }
      disconnect() { /* noop */ }
      takeRecords() {
        return [];
      }
    } as unknown as typeof IntersectionObserver;
  }

  // Mock ResizeObserver if not available
  if (!window.ResizeObserver) {
    window.ResizeObserver = class ResizeObserver {
      observe() { /* noop */ }
      unobserve() { /* noop */ }
      disconnect() { /* noop */ }
    } as unknown as typeof ResizeObserver;
  }

  // Mock localStorage if not available
  if (!window.localStorage) {
    const localStorageMock = (() => {
      let store: Record<string, string> = {};

      return {
        getItem(key: string) {
          return store[key] ?? null;
        },
        setItem(key: string, value: string) {
          store[key] = value.toString();
        },
        removeItem(key: string) {
          delete store[key];
        },
        clear() {
          store = {};
        },
        get length() {
          return Object.keys(store).length;
        },
        key(index: number) {
          const keys = Object.keys(store);
          return keys[index] ?? null;
        },
      };
    })();

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  }

  // Mock clipboard API if not available
  if (!navigator.clipboard) {
    try {
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: async (_text: string) => {
            return Promise.resolve();
          },
          readText: async () => {
            return Promise.resolve('');
          },
        },
        writable: true,
        configurable: true,
      });
    } catch {
      // Ignore errors if clipboard is already defined
    }
  }
} else {
  // In Node.js environment (non-browser tests), set up navigator.clipboard
  if (typeof navigator === 'undefined') {
    (global as unknown as { navigator: Navigator }).navigator = {
      clipboard: {
        writeText: async (_text: string) => Promise.resolve(),
        readText: async () => Promise.resolve(''),
      },
      onLine: true,
    } as Navigator;
  } else if (!navigator.clipboard) {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async (_text: string) => Promise.resolve(),
        readText: async () => Promise.resolve(''),
      },
      writable: true,
      configurable: true,
    });
  }
}

// Clean up after each test
afterEach(() => {
  cleanup();
  
  // Clear DOM content but keep body intact
  if (typeof document !== 'undefined' && document.body) {
    // Clear content but don't remove body
    document.body.innerHTML = '';
  }
});

// Add a global beforeEach to ensure DOM is ready
beforeEach(() => {
  // Ensure document.body exists before each test
  if (typeof document !== 'undefined') {
    if (!document.body) {
      const body = document.createElement('body');
      if (document.documentElement) {
        document.documentElement.appendChild(body);
      }
    }
    
    // Always ensure we have essential containers
    if (!document.getElementById('root')) {
      const root = document.createElement('div');
      root.id = 'root';
      document.body.appendChild(root);
    }
    
    if (!document.getElementById('test-container')) {
      const testContainer = document.createElement('div');
      testContainer.id = 'test-container';
      document.body.appendChild(testContainer);
    }
  }
});

// Mock providers for tests
vi.mock('~/app/map/Cache/_hooks/use-map-cache', () => ({
  useMapCache: vi.fn(() => ({
    // State queries
    items: {},
    center: null,
    expandedItems: [],
    isLoading: false,
    error: null,
    lastUpdated: Date.now(),

    // Query operations
    getRegionItems: vi.fn(() => []),
    hasItem: vi.fn(() => false),
    isRegionLoaded: vi.fn(() => false),

    // Data operations
    loadRegion: vi.fn(async () => ({ success: true, itemCount: 0 })),
    loadItemChildren: vi.fn(async () => ({ success: true, itemCount: 0 })),
    prefetchRegion: vi.fn(async () => ({ success: true, itemCount: 0 })),
    invalidateRegion: vi.fn(),
    invalidateAll: vi.fn(),

    // Navigation operations
    navigateToItem: vi.fn(async () => {
      return undefined;
    }),
    updateCenter: vi.fn(),
    prefetchForNavigation: vi.fn(async () => {
      return undefined;
    }),
    toggleItemExpansionWithURL: vi.fn(),

    // Mutation operations
    createItemOptimistic: vi.fn(async () => {
      return undefined;
    }),
    updateItemOptimistic: vi.fn(async () => {
      return undefined;
    }),
    deleteItemOptimistic: vi.fn(async () => {
      return undefined;
    }),
    moveItemOptimistic: vi.fn(async () => ({ success: true })),
    rollbackOptimisticChange: vi.fn(),
    rollbackAllOptimistic: vi.fn(),
    getPendingOptimisticChanges: vi.fn(() => []),

    // Sync operations
    sync: {
      isOnline: true,
      lastSyncTime: null,
      performSync: vi.fn(async () => ({ success: true, syncedItems: 0, errors: [] })),
      forceSync: vi.fn(async () => ({ success: true, syncedItems: 0, errors: [] })),
      pauseSync: vi.fn(),
      resumeSync: vi.fn(),
      getSyncStatus: vi.fn(() => ({ isPending: false, lastSync: null, error: null })),
    },

    // Configuration
    config: {
      maxDepth: 2,
      maxRadius: 2,
      cacheDuration: 300000,
      enableOffline: true,
    },
    updateConfig: vi.fn(),
  })),
}));

vi.mock('~/contexts/ThemeContext', () => ({
  useTheme: vi.fn(() => ({
    theme: 'light',
    toggleTheme: vi.fn(),
    setTheme: vi.fn(),
  })),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('~/contexts/AuthContext', async () => {
  const React = await import('react');
  const AuthContext = React.createContext({
    user: null,
    mappingUserId: undefined,
    isLoading: false,
    setMappingUserId: vi.fn(),
  });
  
  return {
    AuthContext,
    useAuth: vi.fn(() => ({
      user: null,
      mappingUserId: undefined,
      isLoading: false,
      setMappingUserId: vi.fn(),
    })),
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock tRPC
vi.mock('~/commons/trpc/react', () => ({
  api: {
    useUtils: vi.fn(() => ({
      map: {
        user: {
          getUserMap: {
            invalidate: vi.fn(),
          },
        },
        items: {
          invalidate: vi.fn(),
        },
      },
    })),
    map: {
      user: {
        createDefaultMapForCurrentUser: {
          useMutation: vi.fn(() => ({
            mutate: vi.fn(),
            mutateAsync: vi.fn(),
            isLoading: false,
            isSuccess: false,
            isError: false,
          })),
        },
        getUserMap: {
          useQuery: vi.fn(() => ({
            data: null,
            isLoading: false,
            error: null,
          })),
        },
      },
      // Add the mutations at the correct path
      addItem: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn(() => Promise.resolve({ id: 1, coordId: 'test' })),
          mutate: vi.fn(),
          isLoading: false,
        })),
      },
      updateItem: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn(() => Promise.resolve({ id: 1 })),
          mutate: vi.fn(),
          isLoading: false,
        })),
      },
      removeItem: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn(() => Promise.resolve()),
          mutate: vi.fn(),
          isLoading: false,
        })),
      },
      items: {
        create: {
          useMutation: () => ({
            mutateAsync: vi.fn(() => Promise.resolve({ id: 1, coordId: 'test' })),
            mutate: vi.fn(),
            isLoading: false,
          }),
        },
        update: {
          useMutation: () => ({
            mutateAsync: vi.fn(() => Promise.resolve({ id: 1 })),
            mutate: vi.fn(),
            isLoading: false,
          }),
        },
        delete: {
          useMutation: () => ({
            mutateAsync: vi.fn(() => Promise.resolve()),
            mutate: vi.fn(),
            isLoading: false,
          }),
        },
        move: {
          useMutation: () => ({
            mutateAsync: vi.fn(() => Promise.resolve({ success: true })),
            mutate: vi.fn(),
            isLoading: false,
          }),
        },
        moveMapItem: {
          useMutation: vi.fn(() => ({
            mutateAsync: vi.fn(() => Promise.resolve({ success: true })),
            mutate: vi.fn(),
            isLoading: false,
          })),
        },
      },
    },
  },
}));

// Extend Vitest matchers with custom event bus matchers
expect.extend(eventBusMatchers);
