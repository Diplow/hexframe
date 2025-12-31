import { randomUUID } from 'crypto'
import type { ILLMRepository } from '~/lib/domains/agentic/repositories/llm.repository.interface'
import type { ContextCompositionService } from '~/lib/domains/agentic/services/context-composition.service'
import { PromptTemplateService } from '~/lib/domains/agentic/services/prompt-template.service'
// import { IntentClassifierService } from '../intent-classification/intent-classifier.service'
import type { EventBusService } from '~/lib/utils/event-bus'
import type {
  CompositionConfig,
  LLMResponse,
  LLMGenerationParams,
  StreamChunk,
  ModelInfo,
  LLMMessage,
  ChatMessageContract,
} from '~/lib/domains/agentic/types'
import type { MapContext } from '~/lib/domains/mapping/utils'
// import type { Intent, ClassificationContext } from '../intent-classification/intent.types'
import type { PromptTemplateName } from '~/lib/domains/agentic/prompts/prompts.constants'

export interface GenerateResponseOptions {
  mapContext: MapContext
  messages: ChatMessageContract[]
  model: string
  temperature?: number
  maxTokens?: number
  compositionConfig?: CompositionConfig
  // Context for intent classification
  isOwnSystem?: boolean
  systemBriefDescription?: string
  specialContext?: 'onboarding' | 'importing'
}

export interface SubagentConfig {
  description: string
  tools?: string[]
  disallowedTools?: string[]
  prompt: string
  model?: 'sonnet' | 'opus' | 'haiku' | 'inherit'
}

export class AgenticService {
  private promptTemplate: PromptTemplateService
  private subagents: Map<string, SubagentConfig>
  // private intentClassifier: IntentClassifierService

  constructor(
    private readonly llmRepository: ILLMRepository,
    private readonly contextComposition: ContextCompositionService,
    private readonly eventBus: EventBusService
  ) {
    this.promptTemplate = new PromptTemplateService()
    this.subagents = new Map()
  }

  async generateResponse(options: GenerateResponseOptions): Promise<LLMResponse> {
    if (!this.llmRepository.isConfigured()) {
      throw new Error('LLM repository is not configured')
    }

    // Compose context from tile hierarchy and chat history
    const composedContext = await this.contextComposition.composeContext(
      options.mapContext,
      options.messages,
      options.compositionConfig ?? this.getDefaultCompositionConfig()
    )

    try {
      // Use default prompt template (intent classification temporarily disabled)
      const promptTemplate = 'system-prompt' as PromptTemplateName
      
      // Build LLM messages with context and selected personality
      const llmMessages = this.buildLLMMessages(composedContext, options.messages, promptTemplate)

      // Generate response
      const llmParams: LLMGenerationParams = {
        messages: llmMessages,
        model: options.model,
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens ?? 2048,
        stream: false
      }

      const response = await this.llmRepository.generate(llmParams)

      // Emit success event with personality info
      this.eventBus.emit({
        type: 'agentic.response_generated',
        source: 'agentic',
        payload: {
          response,
          context: composedContext,
          personality: promptTemplate
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
      options.mapContext,
      options.messages,
      options.compositionConfig ?? this.getDefaultCompositionConfig()
    )

    try {
      // Use default prompt template (intent classification temporarily disabled)
      const promptTemplate = 'system-prompt' as PromptTemplateName
      
      // Emit stream started event
      this.eventBus.emit({
        type: 'agentic.stream_started',
        source: 'agentic',
        payload: {
          context: composedContext,
          personality: promptTemplate
        }
      })

      // Build LLM messages with context and selected personality
      const llmMessages = this.buildLLMMessages(composedContext, options.messages, promptTemplate)

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
          context: composedContext,
          personality: promptTemplate
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
    chatMessages: ChatMessageContract[],
    promptTemplateName: PromptTemplateName = 'system-prompt'
  ): LLMMessage[] {
    const messages: LLMMessage[] = []

    // Add system message with context
    const contextString = composedContext.serialize({ 
      type: 'structured', 
      includeMetadata: false 
    })

    messages.push({
      role: 'system',
      content: this.buildSystemPrompt(contextString, promptTemplateName)
    })

    // Convert chat messages to LLM messages
    // Note: ChatMessageContract.content is always a string (widgets are pre-serialized)
    for (const msg of chatMessages) {
      messages.push({
        role: msg.type,
        content: msg.content
      })
    }

    return messages
  }

  private buildSystemPrompt(contextString: string, templateName: PromptTemplateName = 'system-prompt'): string {
    return this.promptTemplate.renderTemplate(templateName, {
      CONTEXT: contextString
    })
  }

  private widgetExtractors = new Map<string, (data: unknown) => string>([
    ['tile', (data) => `[Tile Widget: ${(data as { title?: string })?.title ?? 'Untitled'}]`],
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

  // Intent classification methods temporarily removed due to missing dependencies

  /**
   * Create a subagent with the specified configuration
   *
   * @param config - Subagent configuration including description, prompt, and optional tools
   * @returns Unique identifier for the created subagent
   */
  createSubagent(config: SubagentConfig): string {
    const subagentId = `subagent-${randomUUID()}`
    this.subagents.set(subagentId, config)
    return subagentId
  }

  /**
   * Get the configuration for a specific subagent
   *
   * @param subagentId - The unique identifier of the subagent
   * @returns The subagent configuration
   * @throws Error if subagent not found
   */
  getSubagentConfig(subagentId: string): SubagentConfig {
    const config = this.subagents.get(subagentId)
    if (!config) {
      throw new Error(`Subagent not found: ${subagentId}`)
    }
    return config
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