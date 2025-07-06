import { afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";

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
if (typeof window !== "undefined") {
  // Ensure document.body exists
  if (!document.body) {
    const body = document.createElement('body');
    document.documentElement.appendChild(body);
  }
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
          writeText: async (text: string) => {
            return Promise.resolve();
          },
          readText: async () => {
            return Promise.resolve('');
          },
        },
        writable: true,
        configurable: true,
      });
    } catch (error) {
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
  
  // More aggressive DOM cleanup for test isolation
  if (typeof document !== 'undefined' && document.body) {
    // Clear the entire body and start fresh
    document.body.innerHTML = '';
    
    // Re-create the essential containers
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
    
    // Ensure test containers exist
    const testContainer = document.createElement('div');
    testContainer.id = 'test-container';
    document.body.appendChild(testContainer);
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
