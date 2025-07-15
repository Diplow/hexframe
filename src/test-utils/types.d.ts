declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Assertion<T = any> {
    toHaveEmittedEvent(eventType: string, payload?: unknown): T;
  }
  interface AsymmetricMatchersContaining {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toHaveEmittedEvent(eventType: string, payload?: unknown): any;
  }
}

// This ensures TypeScript recognizes our custom matcher
export {};