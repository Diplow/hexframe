import { Sandbox } from '@vercel/sandbox'
import ms from 'ms'
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

/**
 * Claude Agent SDK Repository using Vercel Sandbox for isolated execution
 *
 * This implementation runs the Claude Agent SDK inside a Vercel Sandbox microVM
 * to enable safe execution of AI-generated code in production environments.
 *
 * Required environment variables:
 * - VERCEL_TOKEN: Vercel access token for sandbox authentication
 * - ANTHROPIC_API_KEY: Anthropic API key for Claude models
 * - HEXFRAME_API_BASE_URL: Base URL for MCP server (optional, defaults to localhost)
 */
export class ClaudeAgentSDKSandboxRepository implements ILLMRepository {
  private readonly apiKey: string
  private readonly mcpApiKey?: string
  private readonly userId?: string
  private sandbox: Awaited<ReturnType<typeof Sandbox.create>> | null = null

  constructor(apiKey: string, mcpApiKey?: string, userId?: string) {
    this.apiKey = apiKey
    this.mcpApiKey = mcpApiKey
    this.userId = userId
  }

  /**
   * Initialize a Vercel Sandbox for isolated code execution
   */
  private async _initializeSandbox(): Promise<void> {
    if (this.sandbox) return

    loggers.agentic('Initializing Vercel Sandbox', {
      hasVercelOidcToken: !!process.env.VERCEL_OIDC_TOKEN
    })

    try {
      this.sandbox = await Sandbox.create({
        runtime: 'node22',
        timeout: ms('5m'), // 5 minutes timeout
        resources: {
          vcpus: 2 // Allocate 2 vCPUs for agent execution
        }
      })

      // Install Claude Agent SDK in the sandbox
      await this.sandbox.runCommand({
        cmd: 'npm',
        args: ['install', '@anthropic-ai/claude-agent-sdk']
      })

      loggers.agentic('Vercel Sandbox initialized successfully')
    } catch (error) {
      loggers.agentic.error('Failed to initialize Vercel Sandbox', {
        error: error instanceof Error ? error.message : String(error)
      })
      throw this.createError(
        'UNKNOWN',
        'Failed to initialize Vercel Sandbox. Ensure VERCEL_OIDC_TOKEN is set.',
        error
      )
    }
  }

  /**
   * Execute Claude Agent SDK query inside the sandbox
   */
  private async _executeInSandbox(
    userPrompt: string,
    systemPrompt: string | undefined,
    model: string,
    streaming: boolean
  ): Promise<{ content: string; usage: LLMResponse['usage'] }> {
    await this._initializeSandbox()

    if (!this.sandbox) {
      throw this.createError('UNKNOWN', 'Sandbox not initialized')
    }

    // Prepare the execution script
    const mcpBaseUrl = process.env.HEXFRAME_API_BASE_URL ?? 'http://localhost:3000'
    const mcpServers = this.mcpApiKey
      ? JSON.stringify({
          hexframe: {
            type: 'http',
            url: `${mcpBaseUrl}/api/mcp`,
            headers: {
              'x-api-key': this.mcpApiKey,
              ...(this.userId ? { 'x-user-id': this.userId } : {})
            }
          }
        })
      : 'undefined'

    const executionScript = `
const { query } = require('@anthropic-ai/claude-agent-sdk');

// Set environment variables
process.env.ANTHROPIC_API_KEY = ${JSON.stringify(this.apiKey)};

async function runAgent() {
  const queryResult = query({
    prompt: ${JSON.stringify(userPrompt)},
    options: {
      model: ${JSON.stringify(model)},
      systemPrompt: ${systemPrompt ? JSON.stringify(systemPrompt) : 'undefined'},
      maxTurns: 10,
      ${streaming ? 'includePartialMessages: true,' : ''}
      mcpServers: ${mcpServers},
      permissionMode: 'bypassPermissions'
    }
  });

  let fullContent = '';
  for await (const msg of queryResult) {
    if (!msg) continue;

    if (msg.type === 'stream_event' && msg.event?.type === 'content_block_delta') {
      const deltaText = msg.event?.delta?.text;
      if (deltaText) {
        fullContent += deltaText;
      }
    } else if (msg.type === 'result' && msg.subtype === 'success') {
      fullContent = msg.result;
    } else if (msg.type === 'result' && (msg.subtype === 'error_during_execution' || msg.subtype === 'error_max_turns' || msg.subtype === 'error_max_budget_usd')) {
      throw new Error(\`SDK error: \${msg.subtype}\`);
    }
  }

  console.log(JSON.stringify({ content: fullContent }));
}

runAgent().catch(error => {
  console.error(JSON.stringify({ error: error.message }));
  process.exit(1);
});
`

    // Execute the script in the sandbox
    const runResult = await this.sandbox.runCommand({
      cmd: 'node',
      args: ['-e', executionScript]
    })

    const stdout = await runResult.stdout()
    const stderr = await runResult.stderr()

    if (runResult.exitCode !== 0) {
      loggers.agentic.error('Sandbox execution failed', {
        exitCode: runResult.exitCode,
        stderr
      })
      throw this.createError('UNKNOWN', `Sandbox execution failed: ${stderr}`)
    }

    // Parse the output
    try {
      const result = JSON.parse(stdout) as { content?: string; error?: string }
      if (result.error) {
        throw this.createError('UNKNOWN', `Agent error: ${result.error}`)
      }

      if (!result.content || typeof result.content !== 'string') {
        throw this.createError('UNKNOWN', 'Invalid response format from sandbox')
      }

      return {
        content: result.content,
        usage: estimateUsage([], result.content)
      }
    } catch (parseError) {
      loggers.agentic.error('Failed to parse sandbox output', {
        stdout,
        parseError
      })
      throw this.createError('UNKNOWN', 'Failed to parse sandbox output')
    }
  }

  async generate(params: LLMGenerationParams): Promise<LLMResponse> {
    try {
      const { messages, model } = params

      const systemPrompt = extractSystemPrompt(messages)
      const userPrompt = buildPrompt(messages)

      loggers.agentic('Claude Agent SDK Sandbox Request', {
        model,
        messageCount: messages.length,
        hasSystemPrompt: Boolean(systemPrompt)
      })

      const { content, usage } = await this._executeInSandbox(
        userPrompt,
        systemPrompt,
        model,
        false
      )

      loggers.agentic('Claude Agent SDK Sandbox Response', {
        model,
        contentLength: content.length
      })

      return {
        id: crypto.randomUUID(),
        model,
        content,
        usage,
        finishReason: 'stop',
        provider: 'claude-agent-sdk-sandbox'
      }
    } catch (error) {
      if ((error as LLMError).code) {
        throw error
      }
      loggers.agentic.error('Claude SDK Sandbox generate() error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      throw this.createError(
        'UNKNOWN',
        `SDK Sandbox error: ${error instanceof Error ? error.message : String(error)}`,
        error
      )
    }
  }

  async generateStream(
    params: LLMGenerationParams,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<LLMResponse> {
    // Note: Streaming from sandbox is complex due to subprocess stdout buffering
    // For now, we'll execute non-streaming and return the full result
    // TODO: Implement proper streaming via websockets or server-sent events
    loggers.agentic('Streaming not fully supported in sandbox mode, falling back to non-streaming')

    const result = await this.generate(params)

    // Simulate streaming by chunking the response
    const chunkSize = 100
    for (let i = 0; i < result.content.length; i += chunkSize) {
      onChunk({
        content: result.content.slice(i, i + chunkSize),
        isFinished: false
      })
    }

    onChunk({ content: '', isFinished: true })

    return result
  }

  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    const modelDatabase = getClaudeModels()
    return modelDatabase.find(m => m.id === modelId) ?? null
  }

  async listModels(): Promise<ModelInfo[]> {
    return getClaudeModels()
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey) && Boolean(process.env.VERCEL_OIDC_TOKEN)
  }

  /**
   * Cleanup sandbox resources
   */
  async cleanup(): Promise<void> {
    if (this.sandbox) {
      loggers.agentic('Cleaning up Vercel Sandbox')
      // Sandbox cleanup is handled automatically by Vercel
      this.sandbox = null
    }
  }

  private createError(
    code: LLMError['code'],
    message: string,
    details?: unknown
  ): LLMError {
    const error = new Error(message) as LLMError
    error.code = code
    error.provider = 'claude-agent-sdk-sandbox'
    error.details = details
    return error
  }
}
