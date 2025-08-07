import { OpenRouterRepository } from '../repositories/openrouter.repository'
import { CanvasContextBuilder } from './canvas-context-builder.service'
import { ChatContextBuilder } from './chat-context-builder.service'
import { ContextCompositionService } from './context-composition.service'
import { SimpleTokenizerService } from './tokenizer.service'
import { AgenticService } from './agentic.service'

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
}

export function createAgenticService(options: CreateAgenticServiceOptions): AgenticService {
  const { openRouterApiKey, eventBus, getCacheState } = options

  // Create repository
  const llmRepository = new OpenRouterRepository(openRouterApiKey)

  // Create tokenizer
  const tokenizer = new SimpleTokenizerService()

  // Create canvas strategies
  const canvasStrategies = new Map<CanvasContextStrategy, ICanvasStrategy>([
    ['standard' as CanvasContextStrategy, new StandardCanvasStrategy(getCacheState)],
    ['minimal' as CanvasContextStrategy, new MinimalCanvasStrategy(getCacheState)],
    ['extended' as CanvasContextStrategy, new ExtendedCanvasStrategy(getCacheState)]
  ])

  // Create chat strategies
  const chatStrategies = new Map<ChatContextStrategy, IChatStrategy>([
    ['full' as ChatContextStrategy, new FullChatStrategy()],
    ['recent' as ChatContextStrategy, new RecentChatStrategy()],
    ['relevant' as ChatContextStrategy, new RelevantChatStrategy()]
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