import "server-only";
import { getApiKey } from "~/lib/utils/request-context";

// Get the base URL for API calls
export function getApiBaseUrl(): string {
  const explicit = process.env.HEXFRAME_API_BASE_URL ?? process.env.BETTER_AUTH_URL ?? process.env.VERCEL_URL;
  if (!explicit) return "http://localhost:3000";
  try {
    const u = explicit.startsWith("http") ? new URL(explicit) : new URL(`https://${explicit}`);
    return `${u.protocol}//${u.host}`;
  } catch {
    const url = explicit.replace(/^https?:\/\//, "");
    const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
    return `${isLocal ? "http" : "https"}://${url}`;
  }
}

// Helper to call tRPC endpoints
export async function callTrpcEndpoint<T>(
  endpoint: string,
  input: unknown,
  options: { requireAuth?: boolean; method?: "GET" | "POST" } = {},
): Promise<T> {
  if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] callTrpcEndpoint: ${endpoint}`, { requireAuth: options.requireAuth, method: options.method });

  try {
    const baseUrl = getApiBaseUrl();
    if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] Base URL: ${baseUrl}`);

  // tRPC batch format for GET requests
  const params = new URLSearchParams({
    batch: "1",
    input: JSON.stringify({ "0": { json: input } }),
  });

  const url = `${baseUrl}/services/api/trpc/${endpoint}?${params}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add API key for authenticated operations
  if (options.requireAuth) {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("API key is required for authenticated operations. Ensure request is running within authenticated context.");
    }
    // Never log API keys
    headers["x-api-key"] = apiKey;
  }

  // Determine if this is a mutation (requires POST) or query (can use GET)
  const isMutation = endpoint.includes('addItem') || endpoint.includes('updateItem') || endpoint.includes('removeItem') || endpoint.includes('moveMapItem');

  // Honor method override if provided, otherwise use mutation detection
  const usePost = options.method === "POST" || (options.method !== "GET" && isMutation);

  let response: Response;
  let rawResponseText: string;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    if (usePost) {
      // POST for mutations - use batch format in body with batch query parameter
      const batchData = { "0": { json: input } };
      const requestBody = JSON.stringify(batchData);
      if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] POST batch body size: ${requestBody.length} chars`);
      response = await fetch(`${baseUrl}/services/api/trpc/${endpoint}?batch=1`, {
        method: "POST",
        headers,
        body: requestBody,
        signal: controller.signal,
      });
    } else {
      // GET for queries
      response = await fetch(url, {
        method: "GET",
        headers,
        signal: controller.signal,
      });
    }

    if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] Response status: ${response.status} ${response.statusText}`);
    if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] Response headers: content-type=${response.headers.get('content-type')}, content-length=${response.headers.get('content-length')}`);

    // Read response body while still under timeout
    rawResponseText = await response.text();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] Raw response body size: ${rawResponseText.length} chars`);

  if (!response.ok) {
    if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] Request failed with status ${response.status}`);
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }

  let data: unknown;
  try {
    data = JSON.parse(rawResponseText);
  } catch (parseError) {
    if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] Failed to parse JSON: ${parseError instanceof Error ? parseError.message : 'parse error'}`);
    throw new Error(`Invalid JSON response from server`);
  }

  if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] Parsed response data shape: ${Array.isArray(data) ? `array[${data.length}]` : typeof data}`);

  // Both mutations and queries return batch format
  const batchData = Array.isArray(data) ? data : [data];
  const item = batchData[0] as { error?: { message?: string }; result?: { data: { json: T } } };

  if (!item) {
    if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] Empty batch response array`);
    throw new Error("Empty API response");
  }

  if (item.error) {
    if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] tRPC error in response: ${item.error?.message ?? 'unknown error'}`);
    throw new Error(item.error.message ?? "API error");
  }

  if (!item.result) {
    if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] No result in response item`);
    throw new Error("Invalid API response");
  }

  if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] Success! Returning data type: ${typeof item.result?.data.json}`);
  return item.result.data.json;

  } catch (error) {
    if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] Exception in callTrpcEndpoint: ${error instanceof Error ? error.message : 'unknown error'}`);
    throw error;
  }
}