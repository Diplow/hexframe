import { OpenRouterRepository } from '../repositories/openrouter.repository'
import { QueuedLLMRepository } from '../repositories/queued-llm.repository'
import { CanvasContextBuilder } from './canvas-context-builder.service'
import { ChatContextBuilder } from './chat-context-builder.service'
import { ContextCompositionService } from './context-composition.service'
import { SimpleTokenizerService } from './tokenizer.service'
import { AgenticService } from './agentic.service'
import { inngest } from '../infrastructure/inngest/client'
import type { ILLMRepository } from '../repositories/llm.repository.interface'

// Canvas strategies
import { StandardCanvasStrategy } from './canvas-strategies/standard.strategy'
import { MinimalCanvasStrategy } from './canvas-strategies/minimal.strategy'
import { ExtendedCanvasStrategy } from './canvas-strategies/extended.strategy'

// Chat strategies
import { FullChatStrategy } from './chat-strategies/full.strategy'
import { RecentChatStrategy } from './chat-strategies/recent.strategy'
import { RelevantChatStrategy } from './chat-strategies/relevant.strategy'

import type { EventBus } from '~/app/map/Services/EventBus/event-bus'
import type { CanvasContextStrategy, ChatContextStrategy } from '../types'
import type { ICanvasStrategy } from './canvas-strategies/strategy.interface'
import type { IChatStrategy } from './chat-strategies/strategy.interface'

import type { CacheState } from '~/app/map/Cache/State/types'

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