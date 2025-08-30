import { OpenRouterRepository } from '~/lib/domains/agentic/repositories/openrouter.repository'
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
  openRouterApiKey: string
  eventBus: EventBus
  getCacheState: () => CacheState
  useQueue?: boolean
  userId?: string // Required when using queue for rate limiting
}

export function createAgenticService(options: CreateAgenticServiceOptions): AgenticService {
  const { openRouterApiKey, eventBus, getCacheState, useQueue, userId } = options

  // Create repository - use queued version if configured
  let llmRepository: ILLMRepository
  
  const baseRepository = new OpenRouterRepository(openRouterApiKey)
  
  console.log('[AgenticFactory] Repository selection:', {
    useQueue,
    userId,
    willUseQueue: !!(useQueue && userId)
  })
  
  if (useQueue && userId) {
    // Use queued repository for production with proper rate limiting
    console.log('[AgenticFactory] Creating QueuedLLMRepository')
    llmRepository = new QueuedLLMRepository(baseRepository, inngest, userId)
  } else {
    // Use direct repository for development or when queue is disabled
    console.log('[AgenticFactory] Using direct OpenRouterRepository')
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