// DON'T import query at module level - it reads env vars on import!
// import { query } from '@anthropic-ai/claude-agent-sdk'
import type { ILLMRepository, StreamCallbacks } from '~/lib/domains/agentic/repositories/llm.repository.interface'
import type {
  LLMGenerationParams,
  LLMResponse,
  StreamChunk,
  ModelInfo,
  LLMError
} from '~/lib/domains/agentic/types/llm.types'
import type { ToolCallStartEvent } from '~/lib/domains/agentic/types/stream.types'
import { loggers } from '~/lib/debug/debug-logger'
import {
  extractSystemPrompt,
  buildPrompt,
  estimateUsage,
  getClaudeModels
} from '~/lib/domains/agentic/repositories/_helpers/sdk-helpers'
import { installAnthropicNetworkInterceptor } from '~/lib/domains/agentic/repositories/_helpers/network-interceptor'

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

// Return type for extractToolCallStart including content block index for correlation
interface ToolCallStartExtraction {
  event: ToolCallStartEvent
  contentBlockIndex: number
}

// Helper function to extract tool_use content block start
function extractToolCallStart(event: unknown): ToolCallStartExtraction | undefined {
  if (
    event &&
    typeof event === 'object' &&
    'type' in event &&
    event.type === 'content_block_start' &&
    'index' in event &&
    typeof event.index === 'number' &&
    'content_block' in event &&
    event.content_block &&
    typeof event.content_block === 'object' &&
    'type' in event.content_block &&
    event.content_block.type === 'tool_use'
  ) {
    const block = event.content_block as { id?: string; name?: string; input?: unknown }
    return {
      event: {
        type: 'tool_call_start',
        toolCallId: block.id ?? '',
        toolName: block.name ?? '',
        arguments: JSON.stringify(block.input ?? {})
      },
      contentBlockIndex: event.index
    }
  }
  return undefined
}

// Track active tool calls to correlate start/end
interface ActiveToolCall {
  toolCallId: string
  toolName: string
  inputJson: string
  contentBlockIndex: number
}

// Helper to extract content_block_stop events that signal tool call completion
function extractContentBlockStop(event: unknown): number | undefined {
  if (
    event &&
    typeof event === 'object' &&
    'type' in event &&
    event.type === 'content_block_stop' &&
    'index' in event &&
    typeof event.index === 'number'
  ) {
    return event.index
  }
  return undefined
}

// Return type for input_json_delta extraction
interface InputJsonDeltaExtraction {
  contentBlockIndex: number
  partialJson: string
}

// Helper function to extract input_json_delta from content_block_delta events
function extractInputJsonDelta(event: unknown): InputJsonDeltaExtraction | undefined {
  if (
    event &&
    typeof event === 'object' &&
    'type' in event &&
    event.type === 'content_block_delta' &&
    'index' in event &&
    typeof event.index === 'number' &&
    'delta' in event &&
    event.delta &&
    typeof event.delta === 'object' &&
    'type' in event.delta &&
    event.delta.type === 'input_json_delta' &&
    'partial_json' in event.delta &&
    typeof event.delta.partial_json === 'string'
  ) {
    return {
      contentBlockIndex: event.index,
      partialJson: event.delta.partial_json
    }
  }
  return undefined
}

export class ClaudeAgentSDKRepository implements ILLMRepository {
  private readonly apiKey: string
  private readonly mcpApiKey?: string
  private readonly userId?: string

  constructor(apiKey: string, mcpApiKey?: string, userId?: string) {
    this.apiKey = apiKey
    this.mcpApiKey = mcpApiKey
    this.userId = userId

    // SECURITY: Use proxy to prevent API key exposure
    const useProxy = process.env.USE_ANTHROPIC_PROXY === 'true'

    if (useProxy) {
      // SECURITY: Require INTERNAL_PROXY_SECRET when proxy is enabled
      if (!process.env.INTERNAL_PROXY_SECRET) {
        throw new Error('INTERNAL_PROXY_SECRET environment variable is required when USE_ANTHROPIC_PROXY=true')
      }

      const mcpBaseUrl = process.env.HEXFRAME_API_BASE_URL ?? 'http://localhost:3000'
      const internalProxySecret = process.env.INTERNAL_PROXY_SECRET

      // CRITICAL: Save the original API key before we overwrite it
      // The proxy needs the real key to call Anthropic
      process.env.ANTHROPIC_API_KEY_ORIGINAL ??= process.env.ANTHROPIC_API_KEY

      // Set base URL to proxy (SDK will append /v1/messages)
      const proxyBaseUrl = `${mcpBaseUrl}/api/anthropic-proxy`

      loggers.agentic('Using Anthropic proxy', {
        userId,
        proxyUrl: proxyBaseUrl,
        proxySecretConfigured: true
      })

      // NETWORK-LEVEL INTERCEPTION
      // Install a global fetch interceptor that catches ALL requests to api.anthropic.com
      // This ensures that even hardcoded URLs in the SDK get redirected through our proxy
      installAnthropicNetworkInterceptor({
        proxyBaseUrl,
        proxySecret: internalProxySecret
      })

      // CRITICAL: Use the proxy secret as the API key
      // The Anthropic SDK will send this in the x-api-key header
      // Our proxy will validate it matches INTERNAL_PROXY_SECRET
      // Then use the real ANTHROPIC_API_KEY to call Anthropic
      process.env.ANTHROPIC_BASE_URL = proxyBaseUrl
      process.env.ANTHROPIC_API_KEY = internalProxySecret

      loggers.agentic('Proxy env vars set', {
        baseUrl: process.env.ANTHROPIC_BASE_URL,
        apiKeyConfigured: !!process.env.ANTHROPIC_API_KEY
      })
    } else {
      // Direct API key usage (legacy mode)
      if (apiKey) {
        process.env.ANTHROPIC_API_KEY = apiKey
      }
    }

    // Enable DEBUG mode to capture subprocess stderr for troubleshooting
    // if (process.env.NODE_ENV === 'development') {
    //   process.env.DEBUG = '*'
    // }
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
        systemPrompt: systemPrompt?.substring(0, 100),
        apiKeySet: !!process.env.ANTHROPIC_API_KEY
      })

      // Configure SDK to use HTTP MCP server
      // In development: http://localhost:3000/api/mcp
      // In production: https://hexframe.ai/api/mcp
      const mcpBaseUrl = process.env.HEXFRAME_API_BASE_URL ?? 'http://localhost:3000'

      // Use provided MCP API key (passed by API layer after orchestrating with IAM domain)
      const mcpApiKey = this.mcpApiKey

      loggers.agentic('MCP Server Configuration', {
        hasMcpApiKey: !!mcpApiKey,
        mcpUrl: `${mcpBaseUrl}/api/mcp`,
        willCreateMcpServers: !!mcpApiKey
      })

      // Always enable MCP server when API key is available
      // The HTTP MCP server at /api/mcp already has all tool definitions
      const mcpServers = mcpApiKey
        ? {
            hexframe: {
              type: 'http' as const,
              url: `${mcpBaseUrl}/api/mcp`,
              headers: {
                'x-api-key': mcpApiKey,
                ...(this.userId ? { 'x-user-id': this.userId } : {})
              }
            }
          }
        : undefined

      // Call SDK query function
      loggers.agentic('About to call SDK query', {
        anthropicBaseUrl: process.env.ANTHROPIC_BASE_URL,
        anthropicApiKeyConfigured: !!process.env.ANTHROPIC_API_KEY
      })

      // CRITICAL: Dynamic import AFTER setting env vars
      // The SDK reads ANTHROPIC_BASE_URL on import, so we must import after setting it
      const { query } = await import('@anthropic-ai/claude-agent-sdk')

      const queryResult = query({
        prompt: userPrompt,
        options: {
          model,
          systemPrompt,
          maxTurns: 50, // Allow multiple turns for complex agentic workflows
          mcpServers,
          permissionMode: 'bypassPermissions' // Allow MCP tools without asking for permission
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
        } else if (msg.type === 'result' && (msg.subtype === 'error_during_execution' || msg.subtype === 'error_max_turns' || msg.subtype === 'error_max_budget_usd')) {
          loggers.agentic.error('SDK result error', {
            subtype: msg.subtype,
            fullMsg: msg
          })
          throw this.createError('UNKNOWN', `SDK returned error: ${msg.subtype}`, msg)
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
    onChunk: (chunk: StreamChunk) => void,
    callbacks?: StreamCallbacks
  ): Promise<LLMResponse> {
    try {
      const { messages, model } = params

      const systemPrompt = extractSystemPrompt(messages)
      const userPrompt = buildPrompt(messages)

      loggers.agentic('Claude Agent SDK Streaming Request', {
        model,
        messageCount: messages.length
      })

      // Configure SDK to use HTTP MCP server
      // In development: http://localhost:3000/api/mcp
      // In production: https://hexframe.ai/api/mcp
      const mcpBaseUrl = process.env.HEXFRAME_API_BASE_URL ?? 'http://localhost:3000'

      // Use provided MCP API key (passed by API layer after orchestrating with IAM domain)
      const mcpApiKey = this.mcpApiKey

      loggers.agentic('MCP Server Configuration (Streaming)', {
        hasMcpApiKey: !!mcpApiKey,
        mcpUrl: `${mcpBaseUrl}/api/mcp`,
        willCreateMcpServers: !!mcpApiKey
      })

      // Always enable MCP server when API key is available
      // The HTTP MCP server at /api/mcp already has all tool definitions
      const mcpServers = mcpApiKey
        ? {
            hexframe: {
              type: 'http' as const,
              url: `${mcpBaseUrl}/api/mcp`,
              headers: {
                'x-api-key': mcpApiKey,
                ...(this.userId ? { 'x-user-id': this.userId } : {})
              }
            }
          }
        : undefined

      // CRITICAL: Dynamic import AFTER setting env vars
      // The SDK reads ANTHROPIC_BASE_URL on import, so we must import after setting it
      const { query } = await import('@anthropic-ai/claude-agent-sdk')

      const queryResult = query({
        prompt: userPrompt,
        options: {
          model,
          systemPrompt,
          maxTurns: 50, // Allow multiple turns for complex agentic workflows
          includePartialMessages: true, // Enable real-time streaming
          mcpServers,
          permissionMode: 'bypassPermissions' // Allow MCP tools without asking for permission
        }
      })

      let fullContent = ''
      // Track active tool calls by content block index to correlate start/stop events
      const activeToolCalls = new Map<number, ActiveToolCall>()

      // Stream chunks via callback
      for await (const msg of queryResult) {
        if (!msg) continue

        if (msg.type === 'stream_event') {
          const deltaText = extractDeltaText(msg.event)
          if (deltaText) {
            fullContent += deltaText
            onChunk({ content: deltaText, isFinished: false })
          }

          // Extract tool call start events
          const toolCallStart = extractToolCallStart(msg.event)
          if (toolCallStart && callbacks?.onToolCallStart) {
            activeToolCalls.set(toolCallStart.contentBlockIndex, {
              toolCallId: toolCallStart.event.toolCallId,
              toolName: toolCallStart.event.toolName,
              inputJson: '', // Start with empty string, accumulate via deltas
              contentBlockIndex: toolCallStart.contentBlockIndex
            })
            callbacks.onToolCallStart(toolCallStart.event)
          }

          // Extract input_json_delta events to accumulate tool arguments
          const inputDelta = extractInputJsonDelta(msg.event)
          if (inputDelta) {
            const activeCall = activeToolCalls.get(inputDelta.contentBlockIndex)
            if (activeCall) {
              activeCall.inputJson += inputDelta.partialJson
            }
          }

          // Extract content_block_stop events to signal tool call end
          const stoppedBlockIndex = extractContentBlockStop(msg.event)
          if (stoppedBlockIndex !== undefined && callbacks?.onToolCallEnd) {
            const activeCall = activeToolCalls.get(stoppedBlockIndex)
            if (activeCall) {
              activeToolCalls.delete(stoppedBlockIndex)
              callbacks.onToolCallEnd({
                type: 'tool_call_end',
                toolCallId: activeCall.toolCallId,
                toolName: activeCall.toolName,
                arguments: activeCall.inputJson || undefined
                // Note: We don't have the result here; it comes later in the stream
              })
            }
          }
        } else if (msg.type === 'result' && msg.subtype === 'success') {
          fullContent = msg.result
        } else if (msg.type === 'result' && (msg.subtype === 'error_during_execution' || msg.subtype === 'error_max_turns' || msg.subtype === 'error_max_budget_usd')) {
          loggers.agentic.error('SDK streaming result error', {
            subtype: msg.subtype,
            fullMsg: msg
          })
          throw this.createError('UNKNOWN', `SDK streaming returned error: ${msg.subtype}`, msg)
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
