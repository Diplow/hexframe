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
 * - model (optional): LLM model to use (default: claude-haiku-4-5-20251001)
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
import { db } from '~/server/db'
import { env } from '~/env'
import { loggers } from '~/lib/debug/debug-logger'

// Domain imports (API layer orchestrates domains)
import { getOrCreateInternalApiKey, validateInternalApiKey } from '~/lib/domains/iam'
import {
  MappingService,
  DbMapItemRepository,
  DbBaseItemRepository,
  asRequesterUserId,
  type HexecuteContext
} from '~/lib/domains/mapping'
import { CoordSystem, Direction, MapItemType } from '~/lib/domains/mapping/utils'
import {
  createAgenticServiceAsync,
  executeTaskStreaming,
  type StreamErrorEvent,
  type StreamDoneEvent,
  type TextDeltaEvent,
  type PromptGeneratedEvent
} from '~/lib/domains/agentic'
import { generateParentHexplanContent, generateLeafHexplanContent } from '~/lib/domains/agentic/utils'
import { EventBus as EventBusImpl } from '~/lib/utils/event-bus'

// =============================================================================
// Input Validation Schema
// =============================================================================

const executeTaskQuerySchema = z.object({
  taskCoords: z.string().min(1, 'taskCoords is required'),
  instruction: z.string().optional(),
  model: z.string().default('claude-haiku-4-5-20251001'),
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
// SSE Helpers
// =============================================================================

interface SSEController {
  enqueue: (chunk: Uint8Array) => void
  close: () => void
}

function _emitError(controller: SSEController, encoder: TextEncoder, code: StreamErrorEvent['code'], message: string): void {
  const errorEvent: StreamErrorEvent = { type: 'error', code, message, recoverable: false }
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`))
  controller.close()
}

function _emitTextDelta(controller: SSEController, encoder: TextEncoder, text: string): void {
  const textDeltaEvent: TextDeltaEvent = { type: 'text_delta', text }
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(textDeltaEvent)}\n\n`))
}

function _emitDone(controller: SSEController, encoder: TextEncoder, totalTokens: number | undefined, durationMs: number): void {
  const doneEvent: StreamDoneEvent = { type: 'done', totalTokens, durationMs }
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(doneEvent)}\n\n`))
  controller.close()
}

function _emitPromptGenerated(controller: SSEController, encoder: TextEncoder, prompt: string): void {
  const promptEvent: PromptGeneratedEvent = { type: 'prompt_generated', prompt }
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(promptEvent)}\n\n`))
}

// =============================================================================
// Service Initialization (Orchestration)
// =============================================================================

function _deriveSandboxSessionId(
  session: { id: string } | null,
  userId: string,
  authMethod: string
): string | undefined {
  if (session?.id) return session.id
  if (authMethod === 'internal-api-key' || authMethod === 'external-api-key') {
    return `${userId}-api-key`
  }
  return undefined
}

async function _createAgenticService(userId: string, sandboxSessionId: string | undefined) {
  const mcpApiKey = await getOrCreateInternalApiKey(userId, 'mcp-session', 10)
  const eventBus = new EventBusImpl()

  return createAgenticServiceAsync({
    llmConfig: {
      openRouterApiKey: env.OPENROUTER_API_KEY ?? '',
      anthropicApiKey: env.ANTHROPIC_API_KEY ?? '',
      preferClaudeSDK: true,
      useSandbox: env.USE_SANDBOX === 'true',
      mcpApiKey
    },
    eventBus,
    useQueue: false,
    userId,
    sessionId: sandboxSessionId
  })
}

// =============================================================================
// Hexplan Management (Orchestration)
// =============================================================================

async function _ensureHexplan(
  mappingService: MappingService,
  hexecuteContext: HexecuteContext,
  taskCoords: string,
  instruction?: string
): Promise<string> {
  if (hexecuteContext.hexPlan) return hexecuteContext.hexPlan

  const taskId = parseInt(hexecuteContext.task.id, 10)
  const taskCoord = CoordSystem.parseId(taskCoords)
  const hexplanCoords = { ...taskCoord, path: [...taskCoord.path, Direction.Center] }

  const hasSubtasks = hexecuteContext.structuralChildren.length > 0
  const hexPlanContent = hasSubtasks
    ? generateParentHexplanContent(hexecuteContext.structuralChildren, hexecuteContext.allLeafTasks)
    : generateLeafHexplanContent(hexecuteContext.task.title, instruction)

  await mappingService.items.crud.addItemToMap({
    parentId: taskId,
    coords: hexplanCoords,
    title: 'Hexplan',
    content: hexPlanContent,
    itemType: MapItemType.SYSTEM,
  })

  return hexPlanContent
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

  // Create encoder and readable stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 1. Create services (orchestration)
        const sandboxSessionId = _deriveSandboxSessionId(session, userId, authMethod)
        const agenticService = await _createAgenticService(userId, sandboxSessionId)

        if (!agenticService.isConfigured()) {
          _emitError(controller, encoder, 'INVALID_API_KEY', 'LLM service not configured: missing API key')
          return
        }

        const repositories = { mapItem: new DbMapItemRepository(db), baseItem: new DbBaseItemRepository(db) }
        const mappingService = new MappingService(repositories)

        // 2. Get hexecute context from mapping domain
        const hexecuteContext = await mappingService.context.getHexecuteContext(
          taskCoords,
          asRequesterUserId(userId)
        )

        if (!hexecuteContext.task.title?.trim()) {
          _emitError(controller, encoder, 'UNKNOWN', `Task tile at ${taskCoords} has an empty title`)
          return
        }

        // 3. Ensure hexplan exists (mapping domain operation)
        const hexPlanContent = await _ensureHexplan(mappingService, hexecuteContext, taskCoords, instruction)

        // 4. Execute task via pure agentic service
        const response = await executeTaskStreaming(
          {
            task: hexecuteContext.task,
            taskCoords,
            composedChildren: hexecuteContext.composedChildren,
            structuralChildren: hexecuteContext.structuralChildren,
            ancestors: hexecuteContext.ancestors,
            allLeafTasks: hexecuteContext.allLeafTasks,
            hexPlanContent,
            model,
            temperature,
            maxTokens
          },
          agenticService,
          (chunk) => {
            if (chunk.content) {
              _emitTextDelta(controller, encoder, chunk.content)
            }
          },
          {
            onPromptBuilt: (prompt) => {
              _emitPromptGenerated(controller, encoder, prompt)
            }
          }
        )

        // 5. Emit completion
        const durationMs = Date.now() - startTime
        _emitDone(controller, encoder, response.usage?.totalTokens, durationMs)
        loggers.api('SSE Stream: Completed', { userId, taskCoords, durationMs, totalTokens: response.usage?.totalTokens })
      } catch (error) {
        console.error('SSE Stream: Error', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        })
        _emitError(controller, encoder, 'UNKNOWN', error instanceof Error ? error.message : 'Internal server error')
      }
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
