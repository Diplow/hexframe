import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";

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

// Set up DOM environment for React testing
// This ensures that document and window are properly available
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
}

// Clean up after each test
afterEach(() => {
  cleanup();
});
