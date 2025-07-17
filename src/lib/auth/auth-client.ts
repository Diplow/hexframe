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

export const authClient = createAuthClient({
  /**
   * The base URL of the auth server.
   * This should match the BETTER_AUTH_URL environment variable used in the backend.
   * It's optional if the auth server is on the same domain as the client.
   * However, explicitly setting it is good practice.
   */
  baseURL:
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
    (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : undefined) ??
    (typeof window !== 'undefined' ? window.location.origin : "http://localhost:3000"),
  basePath: "/api/auth", // Must match the server configuration
  // Use our logging fetch wrapper
  fetch: loggingFetch,
  // Client-side configuration if any based on better-auth documentation.
  // For example, if your backend is hosted on a different URL:
  // serverUrl: process.env.NEXT_PUBLIC_AUTH_SERVER_URL,
});

// Note: We use `process.env.NEXT_PUBLIC_BETTER_AUTH_URL` for the client-side baseURL.
// You'll need to ensure this environment variable is available to the client
// (prefixed with NEXT_PUBLIC_). If BETTER_AUTH_URL is already set in .env,
// you can create a corresponding NEXT_PUBLIC_BETTER_AUTH_URL or use NEXT_PUBLIC_VERCEL_URL if applicable.
// For local development, defaulting to "http://localhost:3000" is a fallback.
