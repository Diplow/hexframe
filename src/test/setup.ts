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
  // Log database connection for debugging
  if (process.env.TEST_DATABASE_URL) {
    console.log(`Using test database: ${process.env.TEST_DATABASE_URL}`);
  } else {
    console.error("WARNING: TEST_DATABASE_URL is not set!");
  }
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
  // React Testing Library cleanup first
  cleanup();
  
  // More thorough DOM cleanup for React 18 createRoot compatibility
  if (typeof document !== 'undefined' && document.querySelectorAll) {
    // Remove all React roots that might be lingering
    const allElements = document.querySelectorAll('[data-reactroot], #root, #test-container, .react-root');
    allElements.forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    
    // Clear body content
    if (document.body) {
      document.body.innerHTML = '';
    }
    
    // Clear document head of any test-added elements
    if (document.head) {
      const testElements = document.head.querySelectorAll('[data-test]');
      testElements.forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
    }
  }
  
  // Clear any React 18 createRoot containers from memory
  if (typeof global !== 'undefined') {
    const globalWithHook = global as typeof global & {
      __REACT_DEVTOOLS_GLOBAL_HOOK__?: {
        onCommitFiberRoot?: unknown;
        onCommitFiberUnmount?: unknown;
      };
    };
    if (globalWithHook.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      try {
        globalWithHook.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot = undefined;
        globalWithHook.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberUnmount = undefined;
      } catch {
        // Ignore cleanup errors
      }
    }
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
    
    // Force re-create containers to ensure clean state
    // Remove existing containers first
    const existingRoot = document.getElementById('root');
    if (existingRoot) {
      existingRoot.remove();
    }
    const existingTestContainer = document.getElementById('test-container');
    if (existingTestContainer) {
      existingTestContainer.remove();
    }
    
    // Create fresh containers
    const root = document.createElement('div');
    root.id = 'root';
    // Add data attribute for easier cleanup
    root.setAttribute('data-test', 'true');
    document.body.appendChild(root);
    
    const testContainer = document.createElement('div');
    testContainer.id = 'test-container';
    testContainer.setAttribute('data-test', 'true');
    document.body.appendChild(testContainer);
    
    // Ensure we have a clean slate for React 18 createRoot
    // Add some additional containers that React Testing Library might need
    const reactContainer = document.createElement('div');
    reactContainer.id = 'react-test-container';
    reactContainer.setAttribute('data-test', 'true');
    document.body.appendChild(reactContainer);
  }
});

// Mock providers for tests
vi.mock('~/app/map/Cache/interface', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
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
    getItem: vi.fn((coordId: string) => {
      // Return mock data that matches test expectations
      if (coordId === 'coord-123') {
        return {
          id: '123',
          coordId: 'coord-123',
          data: {
            name: 'Edit Me',
            description: 'Content to edit',
        preview: undefined,
          },
          position: { q: 0, r: 0, s: 0 },
        };
      }
      return {
        id: coordId.replace('coord-', ''),
        coordId,
        data: {
          name: 'Test Item',
          description: 'Test description',
        preview: undefined,
        },
        position: { q: 0, r: 0, s: 0 },
      };
    }),
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
  };
});

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
    agentic: {
      generateResponse: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn().mockResolvedValue({
            content: 'AI response',
            model: 'test-model',
            usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
            finishReason: 'stop'
          }),
          mutate: vi.fn((
            _args: unknown,
            options?: {
              onSuccess?: (data: {
                content: string;
                model: string;
                usage: { promptTokens: number; completionTokens: number; totalTokens: number };
                finishReason: string;
              }) => void;
              onSettled?: () => void;
              onError?: (error: Error) => void;
            }
          ) => {
            // Simulate successful response
            if (options?.onSuccess) {
              options.onSuccess({
                content: 'AI response',
                model: 'test-model',
                usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
                finishReason: 'stop'
              });
            }
            if (options?.onSettled) {
              options.onSettled();
            }
          }),
          isLoading: false,
          isError: false,
          error: null,
          data: null,
        })),
      },
    },
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
