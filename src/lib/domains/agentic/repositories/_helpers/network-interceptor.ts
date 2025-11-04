/**
 * Network-level interceptor for Anthropic API calls
 *
 * This intercepts ALL HTTP requests to api.anthropic.com at the Node.js level,
 * regardless of where they come from (SDK, direct calls, etc.)
 */

import { loggers } from '~/lib/debug/debug-logger'

interface FetchInterceptorConfig {
  proxyBaseUrl: string
  proxySecret: string
}

let isInterceptorInstalled = false
let originalFetch: typeof globalThis.fetch

/**
 * Install a global fetch interceptor that redirects all Anthropic API calls
 * through our secure proxy
 */
export function installAnthropicNetworkInterceptor(config: FetchInterceptorConfig): void {
  if (isInterceptorInstalled) {
    loggers.agentic('Network interceptor already installed, skipping')
    return
  }

  // Save original fetch
  originalFetch = globalThis.fetch

  // Override global fetch
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

    // Check for bypass flag (set by proxy when making its own requests to Anthropic)
    const headers = init?.headers
    const isBypass = headers && (
      (headers instanceof Headers && headers.get('x-bypass-interceptor') === 'true') ||
      (typeof headers === 'object' && 'x-bypass-interceptor' in headers && headers['x-bypass-interceptor'] === 'true')
    )

    if (isBypass) {
      return originalFetch(input, init)
    }

    // CRITICAL: Don't intercept if this is already going through our proxy!
    // This prevents infinite loops
    if (url.includes('/api/anthropic-proxy') || url.includes('localhost:3000/api/anthropic-proxy')) {
      return originalFetch(input, init)
    }

    // Check if this is a direct Anthropic API call
    if (url.includes('api.anthropic.com')) {
      // Extract the path from the Anthropic URL
      // e.g., "https://api.anthropic.com/v1/messages" -> "/v1/messages"
      const anthropicUrl = new URL(url)
      const apiPath = anthropicUrl.pathname + anthropicUrl.search

      // Build proxy URL
      const proxyUrl = `${config.proxyBaseUrl}${apiPath}`

      // Replace headers with proxy secret
      const headers = new Headers(init?.headers)
      headers.set('x-api-key', config.proxySecret)
      headers.delete('authorization') // Remove any Bearer tokens

      // Make the proxied request using ORIGINAL fetch
      return originalFetch(proxyUrl, {
        ...init,
        headers
      })
    }

    // Not an Anthropic call, pass through
    return originalFetch(input, init)
  }

  isInterceptorInstalled = true
  loggers.agentic('✅ Network interceptor installed for api.anthropic.com')
}

/**
 * Uninstall the network interceptor (for cleanup/testing)
 */
export function uninstallAnthropicNetworkInterceptor(): void {
  if (isInterceptorInstalled && originalFetch) {
    globalThis.fetch = originalFetch
    isInterceptorInstalled = false
    loggers.agentic('Network interceptor uninstalled')
  }
}

/**
 * Check if the interceptor is currently active
 */
export function isNetworkInterceptorActive(): boolean {
  return isInterceptorInstalled
}
