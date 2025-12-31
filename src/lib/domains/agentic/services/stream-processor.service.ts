/**
 * Stream processor for executeTask SSE endpoint
 *
 * Handles the core streaming logic for task execution, including:
 * - Agentic service initialization
 * - Hexplan creation and management
 * - LLM streaming response generation
 */

import { nanoid } from 'nanoid'
import { db } from '~/server/db'
import { env } from '~/env'
import { loggers } from '~/lib/debug/debug-logger'
import {
  MappingService,
  DbMapItemRepository,
  DbBaseItemRepository,
  asRequesterUserId,
  type HexecuteContext
} from '~/lib/domains/mapping'
import { getOrCreateInternalApiKey } from '~/lib/domains/iam'
import { createAgenticServiceAsync } from '~/lib/domains/agentic'
import { EventBus as EventBusImpl } from '~/lib/utils/event-bus'
import { CoordSystem, Direction } from '~/lib/domains/mapping/utils'
import {
  buildPrompt,
  generateParentHexplanContent,
  generateLeafHexplanContent
} from '~/lib/domains/agentic/utils'
import type { CompositionConfig, ChatMessageContract } from '~/lib/domains/agentic/types'
import type {
  StreamErrorEvent,
  StreamDoneEvent,
  TextDeltaEvent
} from '~/lib/domains/agentic/types/stream.types'

// =============================================================================
// Types
// =============================================================================

export interface StreamContext {
  userId: string
  session: { id: string; userId: string } | null
  authMethod: 'session' | 'internal-api-key' | 'external-api-key'
  taskCoords: string
  instruction?: string
  model: string
  temperature?: number
  maxTokens?: number
  startTime: number
}

interface SSEController {
  enqueue: (chunk: Uint8Array) => void
  close: () => void
}

interface SSEEmitter {
  controller: SSEController
  encoder: TextEncoder
}

// =============================================================================
// SSE Emitter Helpers
// =============================================================================

function _emitError(emitter: SSEEmitter, code: StreamErrorEvent['code'], message: string): void {
  const errorEvent: StreamErrorEvent = { type: 'error', code, message, recoverable: false }
  emitter.controller.enqueue(emitter.encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`))
  emitter.controller.close()
}

function _emitTextDelta(emitter: SSEEmitter, text: string): void {
  const textDeltaEvent: TextDeltaEvent = { type: 'text_delta', text }
  emitter.controller.enqueue(emitter.encoder.encode(`data: ${JSON.stringify(textDeltaEvent)}\n\n`))
}

function _emitDone(emitter: SSEEmitter, totalTokens: number | undefined, durationMs: number): void {
  const doneEvent: StreamDoneEvent = { type: 'done', totalTokens, durationMs }
  emitter.controller.enqueue(emitter.encoder.encode(`data: ${JSON.stringify(doneEvent)}\n\n`))
  emitter.controller.close()
}

// =============================================================================
// Service Initialization
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
// Hexplan Management
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
    content: hexPlanContent
  })

  return hexPlanContent
}

// =============================================================================
// Request Building
// =============================================================================

function _buildStreamingRequest(
  hexecuteContext: HexecuteContext,
  taskCoords: string,
  hexPlanContent: string,
  model: string,
  temperature?: number,
  maxTokens?: number
) {
  const hexecutePrompt = buildPrompt({
    task: {
      title: hexecuteContext.task.title,
      content: hexecuteContext.task.content ?? undefined,
      coords: taskCoords
    },
    ancestors: hexecuteContext.ancestors,
    composedChildren: hexecuteContext.composedChildren.map((child) => ({
      title: child.title,
      content: child.content ?? '',
      coords: child.coords
    })),
    structuralChildren: hexecuteContext.structuralChildren,
    hexPlan: hexPlanContent,
    mcpServerName: env.HEXFRAME_MCP_SERVER,
    allLeafTasks: hexecuteContext.allLeafTasks
  })

  const conversationMessages: ChatMessageContract[] = [
    { id: `user-${nanoid()}`, type: 'user', content: hexecutePrompt }
  ]

  const taskTile = hexecuteContext.task
  const mapContext = {
    center: {
      id: taskTile.id,
      ownerId: taskTile.ownerId,
      coords: taskCoords,
      title: taskTile.title,
      content: taskTile.content ?? '',
      preview: taskTile.preview,
      link: taskTile.link ?? '',
      itemType: taskTile.itemType,
      visibility: taskTile.visibility,
      depth: taskTile.depth,
      parentId: taskTile.parentId ?? null,
      originId: taskTile.originId ?? null
    },
    parent: null,
    composed: [],
    children: [],
    grandchildren: []
  }

  const compositionConfig: CompositionConfig = {
    canvas: { enabled: false, strategy: 'minimal' },
    chat: { enabled: true, strategy: 'full' },
    composition: { strategy: 'sequential' }
  }

  return { mapContext, messages: conversationMessages, model, temperature, maxTokens, compositionConfig }
}

// =============================================================================
// Main Stream Processor
// =============================================================================

/**
 * Process the SSE stream for task execution
 */
export async function processTaskStream(
  context: StreamContext,
  controller: SSEController,
  encoder: TextEncoder
): Promise<void> {
  const { userId, session, authMethod, taskCoords, instruction, model, temperature, maxTokens, startTime } =
    context
  const emitter: SSEEmitter = { controller, encoder }

  try {
    const sandboxSessionId = _deriveSandboxSessionId(session, userId, authMethod)
    const agenticService = await _createAgenticService(userId, sandboxSessionId)

    if (!agenticService.isConfigured()) {
      _emitError(emitter, 'INVALID_API_KEY', 'LLM service not configured: missing API key')
      return
    }

    const repositories = { mapItem: new DbMapItemRepository(db), baseItem: new DbBaseItemRepository(db) }
    const mappingService = new MappingService(repositories)
    const hexecuteContext = await mappingService.context.getHexecuteContext(
      taskCoords,
      asRequesterUserId(userId)
    )

    if (!hexecuteContext.task.title?.trim()) {
      _emitError(emitter, 'UNKNOWN', `Task tile at ${taskCoords} has an empty title`)
      return
    }

    const hexPlanContent = await _ensureHexplan(mappingService, hexecuteContext, taskCoords, instruction)
    const streamingRequest = _buildStreamingRequest(
      hexecuteContext,
      taskCoords,
      hexPlanContent,
      model,
      temperature,
      maxTokens
    )

    const response = await agenticService.generateStreamingResponse(streamingRequest, (chunk) => {
      if (chunk.content) _emitTextDelta(emitter, chunk.content)
    })

    const durationMs = Date.now() - startTime
    _emitDone(emitter, response.usage?.totalTokens, durationMs)
    loggers.api('SSE Stream: Completed', { userId, taskCoords, durationMs, totalTokens: response.usage?.totalTokens })
  } catch (error) {
    console.error('SSE Stream: Error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    _emitError(emitter, 'UNKNOWN', error instanceof Error ? error.message : 'Internal server error')
  }
}
