import { OpenRouterRepository } from '~/lib/domains/agentic/repositories/openrouter.repository'
import { ClaudeAgentSDKRepository } from '~/lib/domains/agentic/repositories/claude-agent-sdk.repository'
import { QueuedLLMRepository } from '~/lib/domains/agentic/repositories/queued-llm.repository'
import { CanvasContextBuilder } from '~/lib/domains/agentic/services/canvas-context-builder.service'
import { ChatContextBuilder } from '~/lib/domains/agentic/services/chat-context-builder.service'
import { ContextCompositionService } from '~/lib/domains/agentic/services/context-composition.service'
import { SimpleTokenizerService } from '~/lib/domains/agentic/services/tokenizer.service'
import { AgenticService } from '~/lib/domains/agentic/services/agentic.service'
import { inngest } from '~/lib/domains/agentic/infrastructure'
import type { ILLMRepository } from '~/lib/domains/agentic/repositories/llm.repository.interface'

// Canvas strategies
import { StandardCanvasStrategy } from '~/lib/domains/agentic/services/canvas-strategies/standard.strategy'
import { MinimalCanvasStrategy } from '~/lib/domains/agentic/services/canvas-strategies/minimal.strategy'
import { ExtendedCanvasStrategy } from '~/lib/domains/agentic/services/canvas-strategies/extended.strategy'

// Chat strategies
import { FullChatStrategy } from '~/lib/domains/agentic/services/chat-strategies/full.strategy'
import { RecentChatStrategy } from '~/lib/domains/agentic/services/chat-strategies/recent.strategy'
import { RelevantChatStrategy } from '~/lib/domains/agentic/services/chat-strategies/relevant.strategy'

import type { EventBus } from '~/app/map'
import type { CanvasContextStrategy, ChatContextStrategy } from '~/lib/domains/agentic/types'
import type { ICanvasStrategy } from '~/lib/domains/agentic/services/canvas-strategies/strategy.interface'
import type { IChatStrategy } from '~/lib/domains/agentic/services/chat-strategies/strategy.interface'

import type { CacheState } from '~/app/map'

export interface CreateAgenticServiceOptions {
  openRouterApiKey?: string
  anthropicApiKey?: string
  eventBus: EventBus
  getCacheState: () => CacheState
  useQueue?: boolean
  userId?: string // Required when using queue for rate limiting
  preferClaudeSDK?: boolean // If true, use ClaudeAgentSDKRepository when anthropicApiKey is provided
}

export function createAgenticService(options: CreateAgenticServiceOptions): AgenticService {
  const { openRouterApiKey, anthropicApiKey, eventBus, getCacheState, useQueue, userId, preferClaudeSDK } = options

  // Create repository - use queued version if configured
  let llmRepository: ILLMRepository

  // Choose base repository based on available API keys and preferences
  let baseRepository: ILLMRepository

  if (preferClaudeSDK && anthropicApiKey) {
    // Use Claude Agent SDK repository when explicitly preferred
    baseRepository = new ClaudeAgentSDKRepository(anthropicApiKey)
  } else if (openRouterApiKey) {
    // Default to OpenRouter if available
    baseRepository = new OpenRouterRepository(openRouterApiKey)
  } else if (anthropicApiKey) {
    // Fall back to Claude SDK if only anthropic key is provided
    baseRepository = new ClaudeAgentSDKRepository(anthropicApiKey)
  } else {
    throw new Error('Either openRouterApiKey or anthropicApiKey must be provided')
  }

  if (useQueue && userId) {
    // Use queued repository for production with proper rate limiting
    llmRepository = new QueuedLLMRepository(baseRepository, inngest, userId)
  } else {
    // Use direct repository for development or when queue is disabled
    llmRepository = baseRepository
  }

  // Create tokenizer
  const tokenizer = new SimpleTokenizerService()

  // Create canvas strategies
  const canvasStrategies = new Map<CanvasContextStrategy, ICanvasStrategy>([
    ['standard', new StandardCanvasStrategy(getCacheState)],
    ['minimal', new MinimalCanvasStrategy(getCacheState)],
    ['extended', new ExtendedCanvasStrategy(getCacheState)]
  ])

  // Create chat strategies
  const chatStrategies = new Map<ChatContextStrategy, IChatStrategy>([
    ['full', new FullChatStrategy()],
    ['recent', new RecentChatStrategy()],
    ['relevant', new RelevantChatStrategy()]
  ])

  // Create context builders
  const canvasBuilder = new CanvasContextBuilder(canvasStrategies)
  const chatBuilder = new ChatContextBuilder(chatStrategies)

  // Create composition service
  const contextComposition = new ContextCompositionService(
    canvasBuilder,
    chatBuilder,
    tokenizer
  )

  // Create and return agentic service
  return new AgenticService(
    llmRepository,
    contextComposition,
    eventBus
  )
}