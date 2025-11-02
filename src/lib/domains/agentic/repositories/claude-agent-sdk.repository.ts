import { query } from '@anthropic-ai/claude-agent-sdk'
import type { ILLMRepository } from '~/lib/domains/agentic/repositories/llm.repository.interface'
import type {
  LLMGenerationParams,
  LLMResponse,
  StreamChunk,
  ModelInfo,
  LLMError
} from '~/lib/domains/agentic/types/llm.types'
import { loggers } from '~/lib/debug/debug-logger'
import {
  extractSystemPrompt,
  buildPrompt,
  estimateUsage,
  getClaudeModels
} from '~/lib/domains/agentic/repositories/_helpers/sdk-helpers'

// Helper function to safely extract delta text from SDK events
function extractDeltaText(event: unknown): string | undefined {
  if (
    event &&
    typeof event === 'object' &&
    'type' in event &&
    event.type === 'content_block_delta' &&
    'delta' in event &&
    event.delta &&
    typeof event.delta === 'object' &&
    'text' in event.delta &&
    typeof event.delta.text === 'string'
  ) {
    return event.delta.text
  }
  return undefined
}

export class ClaudeAgentSDKRepository implements ILLMRepository {
  private readonly apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async generate(params: LLMGenerationParams): Promise<LLMResponse> {
    try {
      const { messages, model } = params

      // Convert messages to SDK format
      const systemPrompt = extractSystemPrompt(messages)
      const userPrompt = buildPrompt(messages)

      loggers.agentic('Claude Agent SDK Request', {
        model,
        messageCount: messages.length,
        hasSystemPrompt: Boolean(systemPrompt),
        systemPrompt: systemPrompt?.substring(0, 100)
      })

      // Call SDK query function
      const queryResult = query({
        prompt: userPrompt,
        options: {
          model,
          systemPrompt,
          maxTurns: 1, // For non-streaming, we want a single response
          env: {
            ANTHROPIC_API_KEY: this.apiKey
          }
        }
      })

      // Collect all chunks from async generator
      let fullContent = ''

      for await (const msg of queryResult) {
        if (!msg) continue

        if (msg.type === 'stream_event') {
          const deltaText = extractDeltaText(msg.event)
          if (deltaText) {
            fullContent += deltaText
          }
        } else if (msg.type === 'result' && msg.subtype === 'success') {
          fullContent = msg.result
        }
      }

      loggers.agentic('Claude Agent SDK Response', {
        model,
        contentLength: fullContent.length
      })

      return {
        id: crypto.randomUUID(),
        model,
        content: fullContent,
        usage: estimateUsage(messages, fullContent),
        finishReason: 'stop',
        provider: 'claude-agent-sdk'
      }
    } catch (error) {
      if ((error as LLMError).code) {
        throw error
      }
      loggers.agentic.error('Claude SDK generate() error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        errorObject: error
      })
      throw this.createError('UNKNOWN', `SDK error occurred: ${error instanceof Error ? error.message : String(error)}`, error)
    }
  }

  async generateStream(
    params: LLMGenerationParams,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<LLMResponse> {
    try {
      const { messages, model } = params

      const systemPrompt = extractSystemPrompt(messages)
      const userPrompt = buildPrompt(messages)

      loggers.agentic('Claude Agent SDK Streaming Request', {
        model,
        messageCount: messages.length
      })

      const queryResult = query({
        prompt: userPrompt,
        options: {
          model,
          systemPrompt,
          maxTurns: 1,
          includePartialMessages: true, // Enable real-time streaming
          env: {
            ANTHROPIC_API_KEY: this.apiKey
          }
        }
      })

      let fullContent = ''

      // Stream chunks via callback
      for await (const msg of queryResult) {
        if (!msg) continue

        if (msg.type === 'stream_event') {
          const deltaText = extractDeltaText(msg.event)
          if (deltaText) {
            fullContent += deltaText
            onChunk({ content: deltaText, isFinished: false })
          }
        } else if (msg.type === 'result' && msg.subtype === 'success') {
          fullContent = msg.result
        }
      }

      // Signal completion
      onChunk({ content: '', isFinished: true })

      loggers.agentic('Claude Agent SDK Streaming Complete', {
        model,
        contentLength: fullContent.length
      })

      return {
        id: crypto.randomUUID(),
        model,
        content: fullContent,
        usage: estimateUsage(messages, fullContent),
        finishReason: 'stop',
        provider: 'claude-agent-sdk'
      }
    } catch (error) {
      if ((error as LLMError).code) {
        throw error
      }
      loggers.agentic.error('Claude SDK generateStream() error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        errorObject: error
      })
      throw this.createError('UNKNOWN', `SDK streaming error occurred: ${error instanceof Error ? error.message : String(error)}`, error)
    }
  }

  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    // Static model information for Claude models
    const modelDatabase = getClaudeModels()
    return modelDatabase.find(m => m.id === modelId) ?? null
  }

  async listModels(): Promise<ModelInfo[]> {
    // Return all Claude models
    return getClaudeModels()
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey)
  }

  private createError(
    code: LLMError['code'],
    message: string,
    details?: unknown
  ): LLMError {
    const error = new Error(message) as LLMError
    error.code = code
    error.provider = 'claude-agent-sdk'
    error.details = details
    return error
  }
}
