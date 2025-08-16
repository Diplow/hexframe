import type { ILLMRepository } from '../repositories/llm.repository.interface'
import type { ContextCompositionService } from './context-composition.service'
import type { EventBus } from '~/app/map/interface'
import type { 
  CompositionConfig, 
  LLMResponse, 
  LLMGenerationParams,
  StreamChunk,
  ModelInfo,
  LLMMessage
} from '../types'
import type { ChatMessage } from '~/app/map/interface'

export interface GenerateResponseOptions {
  centerCoordId: string
  messages: ChatMessage[]
  model: string
  temperature?: number
  maxTokens?: number
  compositionConfig?: CompositionConfig
}

export class AgenticService {
  constructor(
    private readonly llmRepository: ILLMRepository,
    private readonly contextComposition: ContextCompositionService,
    private readonly eventBus: EventBus
  ) {}

  async generateResponse(options: GenerateResponseOptions): Promise<LLMResponse> {
    if (!this.llmRepository.isConfigured()) {
      throw new Error('LLM repository is not configured')
    }

    // Compose context from tile hierarchy and chat history
    const composedContext = await this.contextComposition.composeContext(
      options.centerCoordId,
      options.messages,
      options.compositionConfig ?? this.getDefaultCompositionConfig()
    )

    try {
      // Build LLM messages with context
      const llmMessages = this.buildLLMMessages(composedContext, options.messages)

      // Generate response
      const llmParams: LLMGenerationParams = {
        messages: llmMessages,
        model: options.model,
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens ?? 2048,
        stream: false
      }

      const response = await this.llmRepository.generate(llmParams)

      // Emit success event
      this.eventBus.emit({
        type: 'agentic.response_generated',
        source: 'agentic',
        payload: {
          response,
          context: composedContext
        }
      })

      return response
    } catch (error) {
      // Emit error event
      this.eventBus.emit({
        type: 'agentic.error',
        source: 'agentic',
        payload: {
          error,
          context: composedContext
        }
      })
      throw error
    }
  }

  async generateStreamingResponse(
    options: GenerateResponseOptions,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<LLMResponse> {
    if (!this.llmRepository.isConfigured()) {
      throw new Error('LLM repository is not configured')
    }

    // Compose context
    const composedContext = await this.contextComposition.composeContext(
      options.centerCoordId,
      options.messages,
      options.compositionConfig ?? this.getDefaultCompositionConfig()
    )

    try {
      // Emit stream started event
      this.eventBus.emit({
        type: 'agentic.stream_started',
        source: 'agentic',
        payload: {
          context: composedContext
        }
      })

      // Build LLM messages with context
      const llmMessages = this.buildLLMMessages(composedContext, options.messages)

      // Generate streaming response
      const llmParams: LLMGenerationParams = {
        messages: llmMessages,
        model: options.model,
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens ?? 2048,
        stream: true
      }

      const response = await this.llmRepository.generateStream(llmParams, onChunk)

      // Emit stream completed event
      this.eventBus.emit({
        type: 'agentic.stream_completed',
        source: 'agentic',
        payload: {
          response,
          context: composedContext
        }
      })

      return response
    } catch (error) {
      // Emit stream error event
      this.eventBus.emit({
        type: 'agentic.stream_error',
        source: 'agentic',
        payload: {
          error,
          context: composedContext
        }
      })
      throw error
    }
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
    return this.llmRepository.listModels()
  }

  isConfigured(): boolean {
    return this.llmRepository.isConfigured()
  }

  private buildLLMMessages(
    composedContext: ReturnType<ContextCompositionService['composeContext']> extends Promise<infer T> ? T : never,
    chatMessages: ChatMessage[]
  ): LLMMessage[] {
    const messages: LLMMessage[] = []

    // Add system message with context
    const contextString = composedContext.serialize({ 
      type: 'structured', 
      includeMetadata: false 
    })

    messages.push({
      role: 'system',
      content: this.buildSystemPrompt(contextString)
    })

    // Convert chat messages to LLM messages
    for (const msg of chatMessages) {
      if (typeof msg.content === 'string') {
        messages.push({
          role: msg.type,
          content: msg.content
        })
      } else {
        // Handle widget messages by extracting text representation
        messages.push({
          role: msg.type,
          content: this.extractTextFromWidget(msg.content)
        })
      }
    }

    return messages
  }

  private buildSystemPrompt(contextString: string): string {
    return `You are an AI assistant helping users work with Hexframe, a visual framework for building AI-powered systems through hierarchical hexagonal maps.

Current Context:
${contextString}

Instructions:
- Help users understand and work with their tile hierarchies
- Suggest improvements to their tile organization
- Answer questions about the current context
- Be concise and helpful
- Format your responses using Markdown for better readability:
  - Use **bold** for emphasis on important concepts
  - Use \`code\` for technical terms or commands
  - Use bullet points or numbered lists for structured information
  - Use headers (##, ###) to organize longer responses
  - Use code blocks with syntax highlighting when sharing code examples`
  }

  private widgetExtractors = new Map<string, (data: unknown) => string>([
    ['preview', (data) => `[Preview Widget: ${(data as { title?: string })?.title ?? 'Untitled'}]`],
    ['error', (data) => `[Error: ${(data as { message?: string })?.message ?? 'Unknown error'}]`],
    ['loading', (data) => `[Loading: ${(data as { message?: string })?.message ?? 'Loading...'}]`],
    ['creation', () => '[Creation Widget]']
  ])

  private extractTextFromWidget(widget: unknown): string {
    if (!widget || typeof widget !== 'object') {
      return '[Widget]'
    }

    const w = widget as { type: string; data?: unknown }
    const extractor = this.widgetExtractors.get(w.type)
    
    return extractor ? extractor(w.data) : `[${w.type} widget]`
  }

  private getDefaultCompositionConfig(): CompositionConfig {
    return {
      canvas: {
        enabled: true,
        strategy: 'standard',
        options: {
          includeEmptyTiles: false,
          includeDescriptions: true
        }
      },
      chat: {
        enabled: true,
        strategy: 'full',
        options: {
          maxMessages: 20
        }
      },
      composition: {
        strategy: 'sequential',
        maxTotalTokens: 4000,
        tokenAllocation: {
          canvas: 2000,
          chat: 2000
        }
      }
    }
  }
}