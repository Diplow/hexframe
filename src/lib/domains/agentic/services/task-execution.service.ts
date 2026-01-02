/**
 * Pure Task Execution Service for Agentic Domain
 *
 * This service contains ONLY agentic-specific logic:
 * - Building hexecute prompts from pre-resolved context
 * - Streaming LLM responses
 *
 * Uses type-only imports from mapping domain for contract types.
 * Type-only imports have no runtime dependency.
 */

import { nanoid } from 'nanoid'
import { env } from '~/env'
import { buildPrompt } from '~/lib/domains/agentic/utils'
import type { AgenticService } from '~/lib/domains/agentic/services/agentic.service'
import type { CompositionConfig, ChatMessageContract } from '~/lib/domains/agentic/types'
import type { LLMResponse, StreamChunk } from '~/lib/domains/agentic/types/llm.types'
// Type-only imports from mapping domain (no runtime dependency)
import type { MapItemType, Visibility } from '~/lib/domains/mapping'

// =============================================================================
// Types
// =============================================================================

/**
 * Task tile representation matching MapItemContract.
 * Uses type-only imports for proper type compatibility.
 */
export interface TaskTile {
  id: string
  ownerId: string
  title: string
  content: string | undefined
  preview: string | undefined
  link: string | undefined
  itemType: MapItemType
  visibility: Visibility
  depth: number
  parentId: string | null
  originId: string | null
}

/**
 * Composed child tile (context materials at negative directions).
 * Matches MapItemContract shape.
 */
export interface ComposedChildTile {
  title: string
  content: string | undefined
  coords: string
}

/**
 * Structural child tile (subtasks at positive directions).
 * Has preview instead of content for quick scanning.
 */
export interface StructuralChildTile {
  title: string
  preview: string | undefined
  coords: string
}

/**
 * Ancestor tile for context drilling.
 * Contains title, content, and coords for hierarchy context.
 */
export interface AncestorTile {
  title: string
  content: string | undefined
  coords: string
}

/**
 * Leaf task for root hexplan generation.
 */
export interface LeafTask {
  title: string
  coords: string
}

/**
 * Input for task execution - all context pre-resolved by API layer.
 */
export interface TaskExecutionInput {
  /** The task tile to execute */
  task: TaskTile
  /** Task coordinates string */
  taskCoords: string
  /** Context children (negative directions) - full tile data */
  composedChildren: ComposedChildTile[]
  /** Subtask children (positive directions) - title, preview, coords */
  structuralChildren: StructuralChildTile[]
  /** Ancestor tiles for context drilling */
  ancestors: AncestorTile[]
  /** All leaf tasks for root hexplan (may be undefined) */
  allLeafTasks: LeafTask[] | undefined
  /** Pre-resolved hexplan content */
  hexPlanContent: string
  /** LLM model to use */
  model: string
  /** Optional temperature */
  temperature?: number
  /** Optional max tokens */
  maxTokens?: number
}

// =============================================================================
// Request Building (Pure)
// =============================================================================

function _buildStreamingRequest(input: TaskExecutionInput) {
  const {
    task,
    taskCoords,
    composedChildren,
    structuralChildren,
    ancestors,
    allLeafTasks,
    hexPlanContent,
    model,
    temperature,
    maxTokens
  } = input

  const hexecutePrompt = buildPrompt({
    task: {
      title: task.title,
      content: task.content ?? undefined,
      coords: taskCoords
    },
    ancestors,
    composedChildren: composedChildren.map((child) => ({
      title: child.title,
      content: child.content ?? '',
      coords: child.coords
    })),
    structuralChildren,
    hexPlan: hexPlanContent,
    mcpServerName: env.HEXFRAME_MCP_SERVER,
    allLeafTasks,
    itemType: task.itemType
  })

  const conversationMessages: ChatMessageContract[] = [
    { id: `user-${nanoid()}`, type: 'user', content: hexecutePrompt }
  ]

  const mapContext = {
    center: {
      id: task.id,
      ownerId: task.ownerId,
      coords: taskCoords,
      title: task.title,
      content: task.content ?? '',
      preview: task.preview,
      link: task.link ?? '',
      itemType: task.itemType,
      visibility: task.visibility,
      depth: task.depth,
      parentId: task.parentId ?? null,
      originId: task.originId ?? null
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

  return {
    mapContext,
    messages: conversationMessages,
    model,
    temperature,
    maxTokens,
    compositionConfig
  }
}

// =============================================================================
// Main Execution Function
// =============================================================================

/** Optional callbacks for task execution lifecycle events */
export interface TaskExecutionCallbacks {
  /** Called after the prompt is built, before streaming starts */
  onPromptBuilt?: (prompt: string) => void
}

/**
 * Execute a task with streaming LLM response.
 *
 * This is a pure agentic function - it receives pre-resolved context
 * and streams LLM responses via the provided callback.
 *
 * @param input - Pre-resolved task execution input
 * @param agenticService - Configured agentic service instance
 * @param onChunk - Callback for streaming chunks
 * @param callbacks - Optional lifecycle callbacks (e.g., onPromptBuilt)
 * @returns Final LLM response with accumulated content and usage
 */
export async function executeTaskStreaming(
  input: TaskExecutionInput,
  agenticService: AgenticService,
  onChunk: (chunk: StreamChunk) => void,
  callbacks?: TaskExecutionCallbacks
): Promise<LLMResponse> {
  const streamingRequest = _buildStreamingRequest(input)

  // Notify caller of the prompt before streaming starts
  const prompt = streamingRequest.messages[0]?.content ?? ''
  callbacks?.onPromptBuilt?.(prompt)

  return agenticService.generateStreamingResponse(streamingRequest, onChunk)
}
