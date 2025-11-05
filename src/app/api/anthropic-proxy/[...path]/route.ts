import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { env } from '~/env'
import { loggers } from '~/lib/debug/debug-logger'

/**
 * Secure proxy for Anthropic API calls from Vercel Sandbox
 *
 * This is a catch-all route that forwards requests to Anthropic's API
 * while keeping the API key secure on the server side.
 *
 * The Anthropic SDK appends paths like /v1/messages to the base URL,
 * so we need to capture and forward those paths correctly.
 */

// Simple in-memory rate limiting (use Redis in production)
// Note: Rate limiting is currently disabled in development
const rateLimits = new Map<string, { count: number; resetAt: number }>()

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function checkRateLimit(userId: string): { allowed: boolean; reason?: string } {
  // In development, allow unlimited requests
  // Next.js sets NODE_ENV to 'development' when running `pnpm dev`
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV

  if (isDev) {
    return { allowed: true }
  }

  const now = Date.now()
  const limit = rateLimits.get(userId)

  if (!limit || now > limit.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + 3600000 }) // 1 hour window
    return { allowed: true }
  }

  const MAX_REQUESTS_PER_HOUR = 200 // Increased from 50
  if (limit.count >= MAX_REQUESTS_PER_HOUR) {
    return { allowed: false, reason: 'Rate limit exceeded' }
  }

  limit.count++
  return { allowed: true }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params

  try {
    // Extract API key from header - SDK might send as x-api-key OR Authorization Bearer
    const xApiKey = request.headers.get('x-api-key')
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

    const clientApiKey = xApiKey ?? bearerToken
    const expectedAuth = env.INTERNAL_PROXY_SECRET ?? 'change-me-in-production'

    // Validate client API key
    if (!clientApiKey || clientApiKey !== expectedAuth) {
      loggers.agentic.error('Anthropic proxy: Unauthorized request')
      return NextResponse.json(
        { error: 'Unauthorized: Invalid API key' },
        { status: 401 }
      )
    }

    // Build the Anthropic API path from catch-all params
    // path = ['v1', 'messages'] for /api/anthropic-proxy/v1/messages
    const apiPath = path.join('/')

    // TODO: Extract userId from session or request context for rate limiting
    const userId = 'authenticated-user' // Placeholder

    // Check rate limit (disabled for now - TODO: re-enable in production)
    // const rateLimitCheck = checkRateLimit(userId)
    // if (!rateLimitCheck.allowed) {
    //   console.log('[Proxy] Rate limit exceeded')
    //   return NextResponse.json(
    //     { error: rateLimitCheck.reason },
    //     { status: 429 }
    //   )
    // }

    // Get request body (if any - GET requests don't have body)
    let body: Record<string, unknown> | null = null
    if (request.method !== 'GET') {
      body = (await request.json()) as Record<string, unknown>

      // Security: Validate request
      if (!body || typeof body !== 'object') {
        return NextResponse.json(
          { error: 'Invalid request body' },
          { status: 400 }
        )
      }
    }

    // Build the Anthropic API URL
    const targetUrl = `https://api.anthropic.com/${apiPath}`

    // Include any query parameters (like beta=true)
    const queryString = request.nextUrl.search.substring(1) // Remove leading '?'
    const fullTargetUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl

    // Get the REAL Anthropic API key directly from process.env
    // Do NOT use env.ANTHROPIC_API_KEY as it might have been modified by the repository constructor
    // Read directly from the environment at request time
    const apiKeyToUse = process.env.ANTHROPIC_API_KEY_ORIGINAL ?? process.env.ANTHROPIC_API_KEY ?? env.ANTHROPIC_API_KEY ?? ''

    // Forward to Anthropic API
    // CRITICAL: Add special header so interceptor knows to skip this request
    const anthropicResponse = await fetch(fullTargetUrl, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKeyToUse,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': request.headers.get('anthropic-beta') ?? '',
        'x-bypass-interceptor': 'true' // Flag to tell interceptor to ignore this
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    })

    // Handle streaming responses
    if (body?.stream === true) {
      return new NextResponse(anthropicResponse.body, {
        status: anthropicResponse.status,
        headers: {
          'Content-Type': anthropicResponse.headers.get('Content-Type') ?? 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      })
    }

    // For non-streaming, parse and return JSON
    const data = (await anthropicResponse.json()) as Record<string, unknown>

    loggers.agentic('Anthropic proxy: Response received', {
      userId,
      status: anthropicResponse.status,
      usage: data.usage as Record<string, unknown>
    })

    return NextResponse.json(data, {
      status: anthropicResponse.status
    })

  } catch (error) {
    loggers.agentic.error('Anthropic proxy: Error', {
      error: error instanceof Error ? error.message : String(error)
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Support all HTTP methods that Anthropic API uses
export const GET = POST
export const PUT = POST
export const PATCH = POST
export const DELETE = POST
