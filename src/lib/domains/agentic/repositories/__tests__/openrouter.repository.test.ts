import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { OpenRouterRepository } from '~/lib/domains/agentic/repositories/openrouter.repository'
import type { LLMGenerationParams } from '~/lib/domains/agentic/types/llm.types'

// Mock fetch globally
global.fetch = vi.fn()

describe('OpenRouterRepository', () => {
  let repository: OpenRouterRepository
  const mockApiKey = 'test-api-key'

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new OpenRouterRepository(mockApiKey)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generate', () => {
    it('should make a completion request to OpenRouter API', async () => {
      const mockResponse = {
        id: 'gen-123',
        model: 'openai/gpt-3.5-turbo',
        choices: [{
          message: {
            role: 'assistant',
            content: 'Hello! How can I help you today?'
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 8,
          total_tokens: 18
        }
      }

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const params: LLMGenerationParams = {
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello!' }
        ],
        model: 'openai/gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 100
      }

      const result = await repository.generate(params)

      expect(global.fetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mockApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://local.hexframe.ai',
            'X-Title': 'Hexframe'
          },
          body: JSON.stringify({
            messages: params.messages,
            model: params.model,
            temperature: params.temperature,
            max_tokens: params.maxTokens,
            stream: false
          })
        }
      )

      expect(result).toEqual({
        id: 'gen-123',
        model: 'openai/gpt-3.5-turbo',
        content: 'Hello! How can I help you today?',
        usage: {
          promptTokens: 10,
          completionTokens: 8,
          totalTokens: 18
        },
        finishReason: 'stop',
        provider: 'openrouter'
      })
    })

    it('should handle API errors gracefully', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({ error: { message: 'Rate limit exceeded' } })
      } as Response)

      const params: LLMGenerationParams = {
        messages: [{ role: 'user', content: 'Hello!' }],
        model: 'openai/gpt-3.5-turbo'
      }

      await expect(repository.generate(params)).rejects.toMatchObject({
        code: 'RATE_LIMIT',
        statusCode: 429,
        provider: 'openrouter'
      })
    })

    it('should handle network errors', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      )

      const params: LLMGenerationParams = {
        messages: [{ role: 'user', content: 'Hello!' }],
        model: 'openai/gpt-3.5-turbo'
      }

      await expect(repository.generate(params)).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        provider: 'openrouter'
      })
    })
  })

  describe('generateStream', () => {
    it('should handle streaming responses', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'))
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":" world"}}]}\n\n'))
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":5,"completion_tokens":2,"total_tokens":7}}\n\n'))
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
          controller.close()
        }
      })

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        body: mockStream
      } as Response)

      const params: LLMGenerationParams = {
        messages: [{ role: 'user', content: 'Hello!' }],
        model: 'openai/gpt-3.5-turbo',
        stream: true
      }

      const chunks: string[] = []
      const result = await repository.generateStream(params, (chunk) => {
        if (chunk.content) {
          chunks.push(chunk.content)
        }
      })

      expect(chunks).toEqual(['Hello', ' world'])
      expect(result.content).toBe('Hello world')
      expect(result.usage.totalTokens).toBe(7)
    })
  })

  describe('getModelInfo', () => {
    it('should fetch model information', async () => {
      const mockModels = {
        data: [
          {
            id: 'openai/gpt-3.5-turbo',
            name: 'GPT-3.5 Turbo',
            pricing: {
              prompt: '0.0005',
              completion: '0.0015'
            },
            context_length: 16385,
            architecture: {
              modality: 'text->text',
              tokenizer: 'GPT',
              instruct_type: 'none'
            },
            top_provider: {
              max_completion_tokens: 4096
            }
          }
        ]
      }

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockModels
      } as Response)

      const modelInfo = await repository.getModelInfo('openai/gpt-3.5-turbo')

      expect(modelInfo).toEqual({
        id: 'openai/gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'openai',
        contextWindow: 16385,
        maxOutput: 4096,
        pricing: {
          prompt: 0.5,
          completion: 1.5
        }
      })
    })

    it('should return null for unknown models', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      } as Response)

      const modelInfo = await repository.getModelInfo('unknown/model')

      expect(modelInfo).toBeNull()
    })
  })

  describe('listModels', () => {
    it('should return a list of available models', async () => {
      const mockModels = {
        data: [
          {
            id: 'openai/gpt-3.5-turbo',
            name: 'GPT-3.5 Turbo',
            pricing: { prompt: '0.0005', completion: '0.0015' },
            context_length: 16385,
            architecture: { modality: 'text->text' },
            top_provider: { max_completion_tokens: 4096 }
          },
          {
            id: 'anthropic/claude-3-opus',
            name: 'Claude 3 Opus',
            pricing: { prompt: '0.015', completion: '0.075' },
            context_length: 200000,
            architecture: { modality: 'text->text' },
            top_provider: { max_completion_tokens: 4096 }
          }
        ]
      }

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockModels
      } as Response)

      const models = await repository.listModels()

      expect(models).toHaveLength(2)
      expect(models[0]).toMatchObject({
        id: 'openai/gpt-3.5-turbo',
        provider: 'openai'
      })
      expect(models[1]).toMatchObject({
        id: 'anthropic/claude-3-opus',
        provider: 'anthropic'
      })
    })
  })

  describe('isConfigured', () => {
    it('should return true when API key is provided', () => {
      expect(repository.isConfigured()).toBe(true)
    })

    it('should return false when API key is empty', () => {
      const emptyKeyRepo = new OpenRouterRepository('')
      expect(emptyKeyRepo.isConfigured()).toBe(false)
    })
  })
})