import type { ILLMRepository } from '~/lib/domains/agentic/repositories/llm.repository.interface'
import type { 
  LLMGenerationParams, 
  LLMResponse, 
  StreamChunk, 
  ModelInfo,
  LLMError 
} from '~/lib/domains/agentic/types/llm.types'
import { loggers } from '~/lib/debug/debug-logger'

interface OpenRouterCompletionResponse {
  id: string
  model: string
  choices: Array<{
    message?: {
      role: string
      content: string
    }
    delta?: {
      content?: string
    }
    finish_reason?: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

interface OpenRouterModel {
  id: string
  name: string
  pricing: {
    prompt: string
    completion: string
  }
  context_length: number
  architecture: {
    modality: string
    tokenizer: string
    instruct_type?: string
  }
  top_provider: {
    max_completion_tokens: number
  }
}

export class OpenRouterRepository implements ILLMRepository {
  private readonly baseUrl = 'https://openrouter.ai/api/v1'
  
  constructor(private readonly apiKey: string) {}

  async generate(params: LLMGenerationParams): Promise<LLMResponse> {
    try {
      const requestBody = {
        messages: params.messages,
        model: params.model,
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        top_p: params.topP,
        frequency_penalty: params.frequencyPenalty,
        presence_penalty: params.presencePenalty,
        stop: params.stop,
        stream: false
      }
      
      // Debug log the full request to OpenRouter
      loggers.agentic('OpenRouter API Request', {
        url: `${this.baseUrl}/chat/completions`,
        method: 'POST',
        model: params.model,
        messageCount: params.messages.length,
        fullRequest: JSON.stringify(requestBody, null, 2)
      })
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        await this.handleError(response)
      }

      const data = await response.json() as OpenRouterCompletionResponse
      
      // Debug log the response
      loggers.agentic('OpenRouter API Response', {
        model: data.model,
        usage: data.usage,
        choiceCount: data.choices?.length ?? 0,
        finishReason: data.choices?.[0]?.finish_reason
      })

      return this.mapResponse(data)
    } catch (error) {
      if ((error as LLMError).code) {
        throw error
      }
      throw this.createError('NETWORK_ERROR', 'Network error occurred', error)
    }
  }

  async generateStream(
    params: LLMGenerationParams,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<LLMResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          messages: params.messages,
          model: params.model,
          temperature: params.temperature,
          max_tokens: params.maxTokens,
          top_p: params.topP,
          frequency_penalty: params.frequencyPenalty,
          presence_penalty: params.presencePenalty,
          stop: params.stop,
          stream: true
        })
      })

      if (!response.ok) {
        await this.handleError(response)
      }

      return await this.processStream(response, onChunk)
    } catch (error) {
      if ((error as LLMError).code) {
        throw error
      }
      throw this.createError('NETWORK_ERROR', 'Network error occurred', error)
    }
  }

  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: this.getHeaders()
      })

      if (!response.ok) {
        await this.handleError(response)
      }

      const data = await response.json() as { data: OpenRouterModel[] }
      const model = data.data.find(m => m.id === modelId)

      if (!model) {
        return null
      }

      return this.mapModelInfo(model)
    } catch (error) {
      if ((error as LLMError).code) {
        throw error
      }
      throw this.createError('NETWORK_ERROR', 'Failed to fetch model info', error)
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: this.getHeaders()
      })

      if (!response.ok) {
        await this.handleError(response)
      }

      const data = await response.json() as { data: OpenRouterModel[] }

      return data.data.map(model => this.mapModelInfo(model))
    } catch (error) {
      if ((error as LLMError).code) {
        throw error
      }
      throw this.createError('NETWORK_ERROR', 'Failed to fetch models', error)
    }
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey)
  }

  private getHeaders(): Record<string, string> {
    // Use different referer based on environment
    const referer = process.env.NODE_ENV === 'production' 
      ? 'https://hexframe.ai' 
      : 'https://local.hexframe.ai'
    
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': referer,
      'X-Title': 'Hexframe'
    }
  }

  private async handleError(response: Response): Promise<never> {
    let errorMessage = response.statusText
    let errorCode: LLMError['code'] = 'UNKNOWN'

    try {
      const errorData = await response.json() as { error?: { message?: string } }
      errorMessage = errorData.error?.message ?? errorMessage
    } catch {
      // Ignore JSON parse errors
    }

    switch (response.status) {
      case 401:
        errorCode = 'INVALID_API_KEY'
        break
      case 404:
        errorCode = 'MODEL_NOT_FOUND'
        break
      case 429:
        errorCode = 'RATE_LIMIT'
        break
      case 413:
        errorCode = 'CONTEXT_LENGTH_EXCEEDED'
        break
    }

    throw this.createError(errorCode, errorMessage, { statusCode: response.status })
  }

  private createError(
    code: LLMError['code'],
    message: string,
    details?: unknown
  ): LLMError {
    const error = new Error(message) as LLMError
    error.code = code
    error.provider = 'openrouter'
    if (details && typeof details === 'object' && 'statusCode' in details) {
      error.statusCode = details.statusCode as number
    }
    error.details = details
    return error
  }

  private mapResponse(data: OpenRouterCompletionResponse): LLMResponse {
    const choice = data.choices[0]
    if (!choice?.message) {
      throw this.createError('UNKNOWN', 'Invalid response format')
    }

    return {
      id: data.id,
      model: data.model,
      content: choice.message.content,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0
      },
      finishReason: choice.finish_reason as LLMResponse['finishReason'],
      provider: 'openrouter'
    }
  }

  private async processStream(
    response: Response,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<LLMResponse> {
    const reader = response.body?.getReader()
    if (!reader) {
      throw this.createError('UNKNOWN', 'No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let fullContent = ''
    let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    let finishReason: LLMResponse['finishReason']
    let model = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data) as OpenRouterCompletionResponse
              model = parsed.model
              
              const choice = parsed.choices[0]
              if (choice?.delta?.content) {
                fullContent += choice.delta.content
                onChunk({ content: choice.delta.content, isFinished: false })
              }
              
              if (choice?.finish_reason) {
                finishReason = choice.finish_reason as LLMResponse['finishReason']
              }
              
              if (parsed.usage) {
                usage = {
                  promptTokens: parsed.usage.prompt_tokens,
                  completionTokens: parsed.usage.completion_tokens,
                  totalTokens: parsed.usage.total_tokens
                }
              }
            } catch {
              // Ignore parse errors for individual chunks
            }
          }
        }
      }

      onChunk({ content: '', isFinished: true })

      return {
        id: crypto.randomUUID(),
        model,
        content: fullContent,
        usage,
        finishReason,
        provider: 'openrouter'
      }
    } finally {
      reader.releaseLock()
    }
  }

  private mapModelInfo(model: OpenRouterModel): ModelInfo {
    const [provider] = model.id.split('/')

    return {
      id: model.id,
      name: model.name,
      provider: provider ?? 'unknown',
      contextWindow: model.context_length,
      maxOutput: model.top_provider.max_completion_tokens,
      pricing: {
        prompt: parseFloat(model.pricing.prompt) * 1000,
        completion: parseFloat(model.pricing.completion) * 1000
      }
    }
  }
}