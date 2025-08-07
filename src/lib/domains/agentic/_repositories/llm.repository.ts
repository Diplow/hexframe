import type { 
  LLMGenerationParams, 
  LLMResponse, 
  StreamChunk, 
  ModelInfo 
} from '../types/llm.types'

export interface LLMRepository {
  generateResponse(params: LLMGenerationParams): Promise<LLMResponse>
  streamResponse(params: LLMGenerationParams): AsyncGenerator<StreamChunk>
  getAvailableModels(): Promise<ModelInfo[]>
  validateApiKey(): Promise<boolean>
}