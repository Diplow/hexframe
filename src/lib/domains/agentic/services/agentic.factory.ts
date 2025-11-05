import { OpenRouterRepository } from '~/lib/domains/agentic/repositories/openrouter.repository'
import { ClaudeAgentSDKRepository } from '~/lib/domains/agentic/repositories/claude-agent-sdk.repository'
import { ClaudeAgentSDKSandboxRepository } from '~/lib/domains/agentic/repositories/claude-agent-sdk-sandbox.repository'
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

import type { EventBus } from '~/lib/utils/event-bus'
import type { CanvasContextStrategy, ChatContextStrategy } from '~/lib/domains/agentic/types'
import type { ICanvasStrategy } from '~/lib/domains/agentic/services/canvas-strategies/strategy.interface'
import type { IChatStrategy } from '~/lib/domains/agentic/services/chat-strategies/strategy.interface'

export interface LLMConfig {
  openRouterApiKey?: string
  anthropicApiKey?: string
  preferClaudeSDK?: boolean // If true, use ClaudeAgentSDKRepository when anthropicApiKey is provided
  useSandbox?: boolean // If true, use ClaudeAgentSDKSandboxRepository (requires VERCEL_TOKEN)
  mcpApiKey?: string // Internal MCP API key (fetched by API layer from IAM domain)
}

export interface CreateAgenticServiceOptions {
  llmConfig: LLMConfig
  eventBus: EventBus
  useQueue?: boolean
  userId?: string // Required when using queue for rate limiting
}

export function createAgenticService(options: CreateAgenticServiceOptions): AgenticService {
  const { llmConfig, eventBus, useQueue, userId } = options
  const { openRouterApiKey, anthropicApiKey, preferClaudeSDK, useSandbox, mcpApiKey } = llmConfig

  // Normalize API keys to empty strings if missing
  const normalizedAnthropicKey = anthropicApiKey ?? ''
  const normalizedOpenRouterKey = openRouterApiKey ?? ''

  // Create repository - use queued version if configured
  let llmRepository: ILLMRepository

  // Choose base repository based on available API keys and preferences
  // Always construct a repository so isConfigured() can determine readiness
  let baseRepository: ILLMRepository

  if (preferClaudeSDK && normalizedAnthropicKey) {
    // Use Claude Agent SDK repository (sandbox or direct)
    // Pass mcpApiKey for MCP tool access (fetched by API layer from IAM domain)
    if (useSandbox) {
      // Use Vercel Sandbox for production-safe isolated execution
      baseRepository = new ClaudeAgentSDKSandboxRepository(normalizedAnthropicKey, mcpApiKey, userId)
    } else {
      // Use direct SDK for development (not safe for production on Vercel)
      baseRepository = new ClaudeAgentSDKRepository(normalizedAnthropicKey, mcpApiKey, userId)
    }
  } else if (normalizedOpenRouterKey) {
    // Default to OpenRouter if available
    baseRepository = new OpenRouterRepository(normalizedOpenRouterKey)
  } else if (normalizedAnthropicKey) {
    // Fall back to Claude SDK if only anthropic key is provided
    if (useSandbox) {
      baseRepository = new ClaudeAgentSDKSandboxRepository(normalizedAnthropicKey, mcpApiKey, userId)
    } else {
      baseRepository = new ClaudeAgentSDKRepository(normalizedAnthropicKey, mcpApiKey, userId)
    }
  } else {
    // No keys provided - create OpenRouter with empty key, let isConfigured() return false
    baseRepository = new OpenRouterRepository(normalizedOpenRouterKey)
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

  // Create canvas strategies (no longer need getContextSnapshot)
  const canvasStrategies = new Map<CanvasContextStrategy, ICanvasStrategy>([
    ['standard', new StandardCanvasStrategy()],
    ['minimal', new MinimalCanvasStrategy()],
    ['extended', new ExtendedCanvasStrategy()]
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