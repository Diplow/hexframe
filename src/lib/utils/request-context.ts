import "server-only";
import { AsyncLocalStorage } from "async_hooks";

/**
 * Request-scoped context for storing authentication and request data
 * Uses AsyncLocalStorage to provide clean access without parameter passing
 */
interface RequestContext {
  apiKey?: string;
  userId?: string;
}

const requestContext = new AsyncLocalStorage<RequestContext>();

// Intentionally no direct setter; use runWithRequestContext()

/**
 * Run a function within a request context
 * This is the proper way to establish request context
 */
export function runWithRequestContext<T>(
  context: RequestContext,
  fn: () => Promise<T>
): Promise<T> {
  return requestContext.run(context, fn);
}

/**
 * Get the current request context
 * Returns undefined if no context is set
 */
export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore();
}

/**
 * Get the API key from the current request context
 * Returns undefined if no context or no API key is set
 */
export function getApiKey(): string | undefined {
  return getRequestContext()?.apiKey;
}

/**
 * Get the user ID from the current request context
 * Returns undefined if no context or no user ID is set
 */
export function getUserId(): string | undefined {
  return getRequestContext()?.userId;
}

/**
 * Check if we're currently in an authenticated request context
 */
export function isAuthenticated(): boolean {
  return !!getApiKey();
}