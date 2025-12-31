/**
 * SSE Streaming Endpoint for executeTask
 *
 * GET /api/stream/execute-task
 *
 * Streams executeTask events to the frontend via Server-Sent Events.
 * This endpoint replaces the tRPC mutation for real-time streaming.
 *
 * Query Parameters:
 * - taskCoords (required): Coordinates of the task tile to execute
 * - instruction (optional): Runtime instruction for the task
 * - model (optional): LLM model to use (default: claude-opus-4-20250514)
 * - temperature (optional): Temperature for generation (0-2)
 * - maxTokens (optional): Maximum tokens (1-8192)
 *
 * Events emitted (SSE format: "data: {json}\n\n"):
 * - text_delta: Incremental text from LLM
 * - done: Stream completion with metrics
 * - error: Error with code, message, and recoverability
 */

import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '~/server/auth'
import { loggers } from '~/lib/debug/debug-logger'
import { validateInternalApiKey } from '~/lib/domains/iam'
import { processTaskStream, type StreamContext } from '~/lib/domains/agentic'

// =============================================================================
// Input Validation Schema
// =============================================================================

const executeTaskQuerySchema = z.object({
  taskCoords: z.string().min(1, 'taskCoords is required'),
  instruction: z.string().optional(),
  model: z.string().default('claude-opus-4-20250514'),
  temperature: z.coerce.number().min(0).max(2).optional(),
  maxTokens: z.coerce.number().min(1).max(8192).optional()
})

// =============================================================================
// Authentication
// =============================================================================

interface AuthResult {
  user: { id: string }
  session: { id: string; userId: string } | null
  authMethod: 'session' | 'internal-api-key' | 'external-api-key'
}

async function _authenticateRequest(request: NextRequest): Promise<AuthResult | null> {
  const headers = new Headers(request.headers)

  // Try session authentication first
  try {
    const sessionData = await auth.api.getSession({ headers })
    if (sessionData?.session && sessionData?.user) {
      return {
        user: { id: sessionData.user.id },
        session: { id: sessionData.session.id, userId: sessionData.user.id },
        authMethod: 'session'
      }
    }
  } catch {
    // Session auth failed, try API key
  }

  // Try API key authentication
  const apiKey = headers.get('x-api-key') ?? undefined
  if (!apiKey) {
    return null
  }

  // Try internal API key first
  const userIdHint = headers.get('x-user-id') ?? undefined
  const internalResult = await validateInternalApiKey(apiKey, userIdHint)
  if (internalResult) {
    return {
      user: { id: internalResult.userId },
      session: null,
      authMethod: 'internal-api-key'
    }
  }

  // Try external API key (better-auth)
  try {
    const result = await auth.api.verifyApiKey({ body: { key: apiKey } })
    if (result.valid && result.key?.userId) {
      return {
        user: { id: result.key.userId },
        session: null,
        authMethod: 'external-api-key'
      }
    }
  } catch {
    // API key validation failed
  }

  return null
}

// =============================================================================
// Main Route Handler
// =============================================================================

export async function GET(request: NextRequest): Promise<Response> {
  const startTime = Date.now()

  // Parse and validate query parameters
  const searchParams = request.nextUrl.searchParams
  const parseResult = executeTaskQuerySchema.safeParse({
    taskCoords: searchParams.get('taskCoords'),
    instruction: searchParams.get('instruction') ?? undefined,
    model: searchParams.get('model') ?? undefined,
    temperature: searchParams.get('temperature') ?? undefined,
    maxTokens: searchParams.get('maxTokens') ?? undefined
  })

  if (!parseResult.success) {
    const errorMessage = parseResult.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ')
    return NextResponse.json({ error: `Invalid parameters: ${errorMessage}` }, { status: 400 })
  }

  const { taskCoords, instruction, model, temperature, maxTokens } = parseResult.data

  // Authenticate request
  const authResult = await _authenticateRequest(request)
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 })
  }

  const { user, session, authMethod } = authResult
  const userId = user.id

  loggers.api('SSE Stream: Request authenticated', { userId, authMethod, taskCoords, model })

  // Build stream context
  const streamContext: StreamContext = {
    userId,
    session,
    authMethod,
    taskCoords,
    instruction,
    model,
    temperature,
    maxTokens,
    startTime
  }

  // Create encoder and readable stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      await processTaskStream(streamContext, controller, encoder)
    }
  })

  // Return SSE response
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  })
}
