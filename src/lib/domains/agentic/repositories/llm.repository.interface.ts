import type { LLMGenerationParams, LLMResponse, StreamChunk, ModelInfo } from '~/lib/domains/agentic/types/llm.types'

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
    onChunk: (chunk: StreamChunk) => void
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