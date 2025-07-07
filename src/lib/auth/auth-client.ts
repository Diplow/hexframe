import { createAuthClient } from "better-auth/client";

// Add logging to better understand auth state
const originalGet = (client: any) => {
  const get = client.useSession.get.bind(client.useSession);
  return () => {
    const result = get();
    console.log("[AUTH CLIENT] useSession.get() called:", {
      hasData: !!result.data,
      hasUser: !!result.data?.user,
      isPending: result.isPending,
      hasError: !!result.error,
      error: result.error,
      userId: result.data?.user?.id,
      userEmail: result.data?.user?.email,
    });
    return result;
  };
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
    "http://localhost:3000",
  basePath: "/api/auth", // Must match the server configuration
  // Client-side configuration if any based on better-auth documentation.
  // For example, if your backend is hosted on a different URL:
  // serverUrl: process.env.NEXT_PUBLIC_AUTH_SERVER_URL,
});

// Add logging wrapper after client creation
(authClient as any).useSession.get = originalGet(authClient);

// Note: We use `process.env.NEXT_PUBLIC_BETTER_AUTH_URL` for the client-side baseURL.
// You'll need to ensure this environment variable is available to the client
// (prefixed with NEXT_PUBLIC_). If BETTER_AUTH_URL is already set in .env,
// you can create a corresponding NEXT_PUBLIC_BETTER_AUTH_URL or use NEXT_PUBLIC_VERCEL_URL if applicable.
// For local development, defaulting to "http://localhost:3000" is a fallback.
