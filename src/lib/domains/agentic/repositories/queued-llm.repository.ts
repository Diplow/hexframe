import type { ILLMRepository } from '~/lib/domains/agentic/repositories/llm.repository.interface'
import type { 
  LLMGenerationParams, 
  LLMResponse, 
  StreamChunk, 
  ModelInfo 
} from '../types/llm.types'
import type { Inngest } from 'inngest'
import { loggers } from '~/lib/debug/debug-logger'
import { nanoid } from 'nanoid'

// Models that are fast enough to run directly (< 5s typical response time)
const QUICK_MODELS = [
  'gpt-4o-mini',
  'gpt-3.5-turbo',
  'claude-3-haiku',
  'deepseek/deepseek-chat',
  'mistral/mistral-small',
  'gemini/gemini-flash'
]

// Models that need queuing due to long response times
const SLOW_MODELS = [
  'deepseek/deepseek-r1',
  'deepseek-r1',  // Various naming formats
  'o1-preview',
  'o1-mini',
  'claude-3-opus',
  'gpt-4-turbo'
]

export interface QueuedResponse extends Omit<LLMResponse, 'finishReason'> {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  jobId?: string
  finishReason?: 'error' | 'length' | 'stop' | 'content_filter' | 'queued'
}

export class QueuedLLMRepository implements ILLMRepository {
  constructor(
    private readonly baseRepository: ILLMRepository,
    private readonly inngestClient: Inngest,
    private readonly userId: string // For rate limiting per user
  ) {}

  isConfigured(): boolean {
    return this.baseRepository.isConfigured()
  }

  private isQuickModel(model: string): boolean {
    return QUICK_MODELS.some(quickModel => 
      model.toLowerCase().includes(quickModel.toLowerCase())
    )
  }

  private shouldQueue(model: string, estimatedTokens?: number): boolean {
    const modelLower = model.toLowerCase()
    
    // Always queue slow models (check if model contains any slow model pattern)
    const isSlowModel = SLOW_MODELS.some(slowModel => 
      modelLower.includes(slowModel.toLowerCase())
    )
    
    if (isSlowModel) {
      console.log(`[QueuedLLMRepository] Model "${model}" matched slow model pattern - will queue`)
      return true
    }

    // Queue if large context (>4k tokens estimated)
    if (estimatedTokens && estimatedTokens > 4000) {
      console.log(`[QueuedLLMRepository] Large context (${estimatedTokens} tokens) - will queue`)
      return true
    }

    // Don't queue quick models with normal context
    console.log(`[QueuedLLMRepository] Model "${model}" is quick with normal context - will NOT queue`)
    return false
  }

  async generate(params: LLMGenerationParams): Promise<LLMResponse> {
    const estimatedTokens = this.estimateTokenCount(params.messages)
    
    console.log('[QueuedLLMRepository] Routing decision:', {
      model: params.model,
      estimatedTokens,
      isQuickModel: this.isQuickModel(params.model),
      shouldQueue: this.shouldQueue(params.model, estimatedTokens),
      userId: this.userId
    })
    
    // For quick models and small contexts, go direct
    if (!this.shouldQueue(params.model, estimatedTokens)) {
      loggers.agentic('Direct LLM call (quick model)', { 
        model: params.model,
        estimatedTokens 
      })
      console.log('[QueuedLLMRepository] Using DIRECT path (not queued)')
      return this.baseRepository.generate(params)
    }

    // For slow models or large contexts, queue the job
    console.log('[QueuedLLMRepository] Using QUEUED path via Inngest')
    loggers.agentic('Queueing LLM request', { 
      model: params.model,
      estimatedTokens,
      userId: this.userId 
    })

    const jobId = `llm-${nanoid()}`
    console.log(`[QueuedLLMRepository] Creating job with ID: ${jobId}`)
    
    // Send to Inngest queue
    await this.inngestClient.send({
      name: "llm/generate.request",
      data: {
        jobId,
        userId: this.userId,
        params,
        estimatedTokens,
        timestamp: new Date().toISOString()
      }
    })
    
    console.log(`[QueuedLLMRepository] Job ${jobId} sent to Inngest`)

    // Return a pending response with job ID
    const queuedResponse: QueuedResponse = {
      id: jobId,
      content: '',
      model: params.model,
      status: 'pending',
      jobId,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      },
      finishReason: 'queued'
    }

    return queuedResponse as unknown as LLMResponse
  }

  async generateStream(
    params: LLMGenerationParams,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<LLMResponse> {
    // For streaming, we can still use the base repository directly
    // as streaming keeps the connection alive and doesn't timeout
    // But we might want to queue if the model is known to be very slow
    
    if (this.shouldQueue(params.model)) {
      // For slow models, even streaming might timeout during initial thinking
      // So we queue it and stream from the job result later
      const jobId = `llm-stream-${nanoid()}`
      
      await this.inngestClient.send({
        name: "llm/stream.request",
        data: {
          jobId,
          userId: this.userId,
          params,
          timestamp: new Date().toISOString()
        }
      })

      // Return a pending response
      const queuedResponse: QueuedResponse = {
        id: jobId,
        content: '',
        model: params.model,
        status: 'pending',
        jobId,
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        },
        finishReason: 'queued'
      }
      return queuedResponse as unknown as LLMResponse
    }

    // For quick models, stream directly
    return this.baseRepository.generateStream(params, onChunk)
  }

  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    // Model info can always be fetched directly
    return this.baseRepository.getModelInfo(modelId)
  }

  async listModels(): Promise<ModelInfo[]> {
    // Model listing can always be done directly
    return this.baseRepository.listModels()
  }

  private estimateTokenCount(messages: LLMGenerationParams['messages']): number {
    // Rough estimation: ~4 characters per token
    const totalChars = messages.reduce((sum, msg) => {
      const content = typeof msg.content === 'string' 
        ? msg.content 
        : JSON.stringify(msg.content)
      return sum + content.length
    }, 0)
    
    return Math.ceil(totalChars / 4)
  }
}