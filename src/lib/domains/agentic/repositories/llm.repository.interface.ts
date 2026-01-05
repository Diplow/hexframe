import type { LLMGenerationParams, LLMResponse, StreamChunk, ModelInfo } from '~/lib/domains/agentic/types/llm.types'
import type { ToolCallStartEvent, ToolCallEndEvent } from '~/lib/domains/agentic/types/stream.types'

/**
 * Callbacks for tool call events during streaming
 */
export interface StreamCallbacks {
  /** Called when a tool call starts */
  onToolCallStart?: (event: ToolCallStartEvent) => void
  /** Called when a tool call completes */
  onToolCallEnd?: (event: ToolCallEndEvent) => void
}

export interface ILLMRepository {
  /**
   * Generate a completion for the given messages
   */
  generate(params: LLMGenerationParams): Promise<LLMResponse>

  /**
   * Generate a streaming completion for the given messages
   */
  generateStream(
    params: LLMGenerationParams,
    onChunk: (chunk: StreamChunk) => void,
    callbacks?: StreamCallbacks
  ): Promise<LLMResponse>

  /**
   * Get information about a specific model
   */
  getModelInfo(modelId: string): Promise<ModelInfo | null>

  /**
   * List all available models
   */
  listModels(): Promise<ModelInfo[]>

  /**
   * Check if the repository is properly configured
   */
  isConfigured(): boolean
}