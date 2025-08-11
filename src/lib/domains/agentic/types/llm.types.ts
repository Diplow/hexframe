export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMGenerationParams {
  messages: LLMMessage[]
  model: string
  temperature?: number
  maxTokens?: number
  topP?: number
  stream?: boolean
  frequencyPenalty?: number
  presencePenalty?: number
  stop?: string[]
}

export interface LLMResponse {
  id: string
  model: string
  content: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  finishReason?: 'stop' | 'length' | 'content_filter' | 'error'
  provider?: string
}

export interface StreamChunk {
  content: string
  isFinished: boolean
}

export interface ModelInfo {
  id: string
  name: string
  provider: string
  contextWindow: number
  maxOutput: number
  pricing?: {
    prompt: number  // per 1k tokens
    completion: number  // per 1k tokens
  }
}

export interface LLMProvider {
  name: string
  models: ModelInfo[]
  defaultModel: string
}

export interface LLMError extends Error {
  code: 'RATE_LIMIT' | 'INVALID_API_KEY' | 'MODEL_NOT_FOUND' | 'CONTEXT_LENGTH_EXCEEDED' | 'NETWORK_ERROR' | 'UNKNOWN'
  statusCode?: number
  provider?: string
  details?: unknown
}