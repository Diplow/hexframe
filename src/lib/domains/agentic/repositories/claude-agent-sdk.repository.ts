import { query } from '@anthropic-ai/claude-agent-sdk'
import type { SDKMessage, SDKResultMessage } from '@anthropic-ai/claude-agent-sdk'
import type { ILLMRepository } from '~/lib/domains/agentic/repositories/llm.repository.interface'
import type {
  LLMGenerationParams,
  LLMResponse,
  StreamChunk,
  ModelInfo,
  LLMError
} from '~/lib/domains/agentic/types/llm.types'
import { loggers } from '~/lib/debug/debug-logger'

export class ClaudeAgentSDKRepository implements ILLMRepository {
  private readonly apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async generate(params: LLMGenerationParams): Promise<LLMResponse> {
    try {
      const { messages, model } = params

      // Convert messages to SDK format
      const systemPrompt = _extractSystemPrompt(messages)
      const userPrompt = _buildPrompt(messages)

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
          maxTurns: 1 // For non-streaming, we want a single response
        }
      })

      // Collect all chunks from async generator
      let fullContent = ''

      for await (const msg of queryResult) {
        if (!msg) continue

        if (msg.type === 'stream_event' && msg.event?.type === 'content_block_delta') {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const deltaText = (msg.event as any).delta?.text as string | undefined
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
        usage: _estimateUsage(messages, fullContent),
        finishReason: 'stop',
        provider: 'claude-agent-sdk'
      }
    } catch (error) {
      if ((error as LLMError).code) {
        throw error
      }
      throw _createError('UNKNOWN', 'SDK error occurred', error)
    }
  }

  async generateStream(
    params: LLMGenerationParams,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<LLMResponse> {
    try {
      const { messages, model } = params

      const systemPrompt = _extractSystemPrompt(messages)
      const userPrompt = _buildPrompt(messages)

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
          includePartialMessages: true // Enable real-time streaming
        }
      })

      let fullContent = ''

      // Stream chunks via callback
      for await (const msg of queryResult) {
        if (!msg) continue

        if (msg.type === 'stream_event' && msg.event?.type === 'content_block_delta') {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const deltaText = (msg.event as any).delta?.text as string | undefined
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
        usage: _estimateUsage(messages, fullContent),
        finishReason: 'stop',
        provider: 'claude-agent-sdk'
      }
    } catch (error) {
      if ((error as LLMError).code) {
        throw error
      }
      throw _createError('UNKNOWN', 'SDK streaming error occurred', error)
    }
  }

  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    // Static model information for Claude models
    const modelDatabase = _getClaudeModels()
    return modelDatabase.find(m => m.id === modelId) ?? null
  }

  async listModels(): Promise<ModelInfo[]> {
    // Return all Claude models
    return _getClaudeModels()
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey)
  }
}

// Private helper functions

function _extractSystemPrompt(
  messages: LLMGenerationParams['messages']
): string | undefined {
  const systemMessage = messages.find(m => m.role === 'system')
  return systemMessage?.content
}

function _buildPrompt(messages: LLMGenerationParams['messages']): string {
  // Filter out system messages and build conversation
  const conversationMessages = messages.filter(m => m.role !== 'system')

  if (conversationMessages.length === 0) {
    return ''
  }

  // If only user messages, return last one
  if (conversationMessages.every(m => m.role === 'user')) {
    return conversationMessages[conversationMessages.length - 1]?.content ?? ''
  }

  // Build multi-turn conversation
  return conversationMessages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n')
}

function _estimateUsage(
  messages: LLMGenerationParams['messages'],
  response: string
): { promptTokens: number; completionTokens: number; totalTokens: number } {
  // Rough estimation: ~4 characters per token
  const promptText = messages.map(m => m.content).join(' ')
  const promptTokens = Math.ceil(promptText.length / 4)
  const completionTokens = Math.ceil(response.length / 4)

  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens
  }
}

function _createError(
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

function _getClaudeModels(): ModelInfo[] {
  return [
    {
      id: 'claude-sonnet-4-5-20250929',
      name: 'Claude Sonnet 4.5',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutput: 8192,
      pricing: {
        prompt: 3.0,
        completion: 15.0
      }
    },
    {
      id: 'claude-opus-4-20250514',
      name: 'Claude Opus 4',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutput: 8192,
      pricing: {
        prompt: 15.0,
        completion: 75.0
      }
    },
    {
      id: 'claude-haiku-4-20250228',
      name: 'Claude Haiku 4',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutput: 8192,
      pricing: {
        prompt: 0.8,
        completion: 4.0
      }
    },
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutput: 8192,
      pricing: {
        prompt: 3.0,
        completion: 15.0
      }
    }
  ]
}
