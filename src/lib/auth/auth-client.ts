import { createAuthClient } from "better-auth/client";
import { loggers } from "~/lib/debug/debug-logger";

// Create a wrapper around fetch to add logging
const loggingFetch: typeof fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();
  const method = init?.method ?? 'GET';
  const requestId = `auth-${method}-${Math.random().toString(36).substring(7)}`;
  const startTime = Date.now();
  
  loggers.api(`AUTH CLIENT ${method}: ${url}`, {
    requestId,
    method,
    url,
    body: init?.body,
    headers: init?.headers
  });
  
  try {
    const response = await fetch(input, init);
    const duration = Date.now() - startTime;
    
    loggers.api(`AUTH CLIENT RESPONSE: ${url} (${duration}ms)`, {
      requestId,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    loggers.api(`AUTH CLIENT ERROR: ${url} (${duration}ms)`, {
      requestId,
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack,
      } : error
    });
    
    throw error;
  }
};

/**
 * Get the base URL for the auth client.
 * Priority:
 * 1. NEXT_PUBLIC_BETTER_AUTH_URL (explicit configuration)
 * 2. window.location.origin (for preview deployments and SSR)
 * 3. http://localhost:3000 (fallback for server-side rendering)
 */
function getAuthClientBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BETTER_AUTH_URL) {
    return process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
  }

  // Use current origin for preview deployments
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // SSR fallback
  return "http://localhost:3000";
}

export const authClient = createAuthClient({
  baseURL: getAuthClientBaseUrl(),
  basePath: "/api/auth", // Must match the server configuration
  fetch: loggingFetch,
});
