import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AgenticService } from '../agentic.service'
import type { ILLMRepository } from '../../repositories/llm.repository.interface'
import type { ContextCompositionService } from '../context-composition.service'
import type { EventBus } from '~/app/map/Services/EventBus/event-bus'
import type { ComposedContext, LLMResponse, StreamChunk } from '../../types'
import type { ChatMessage } from '~/app/map/Chat/interface'

describe('AgenticService', () => {
  let mockLLMRepository: ILLMRepository
  let mockContextComposition: ContextCompositionService
  let mockEventBus: EventBus
  let service: AgenticService

  const mockComposedContext: ComposedContext = {
    type: 'composed',
    contexts: [],
    composition: {
      strategy: 'sequential'
    },
    metadata: {
      computedAt: new Date(),
      tokenEstimate: 100
    },
    serialize: vi.fn().mockReturnValue('serialized context')
  }

  const mockLLMResponse: LLMResponse = {
    id: 'response-123',
    model: 'openai/gpt-3.5-turbo',
    content: 'This is a response from the LLM',
    usage: {
      promptTokens: 50,
      completionTokens: 20,
      totalTokens: 70
    },
    finishReason: 'stop',
    provider: 'openrouter'
  }

  beforeEach(() => {
    mockLLMRepository = {
      generate: vi.fn().mockResolvedValue(mockLLMResponse),
      generateStream: vi.fn(),
      getModelInfo: vi.fn(),
      listModels: vi.fn(),
      isConfigured: vi.fn().mockReturnValue(true)
    }

    mockContextComposition = {
      composeContext: vi.fn().mockResolvedValue(mockComposedContext)
    } as unknown as ContextCompositionService

    mockEventBus = {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn()
    } as unknown as EventBus

    service = new AgenticService(
      mockLLMRepository,
      mockContextComposition,
      mockEventBus
    )
  })

  describe('generateResponse', () => {
    const mockMessages: ChatMessage[] = [
      {
        id: '1',
        type: 'user',
        content: 'Hello, can you help me?'
      }
    ]

    it('should generate a response with composed context', async () => {
      const result = await service.generateResponse({
        centerCoordId: 'user:123,group:456:1,2',
        messages: mockMessages,
        model: 'openai/gpt-3.5-turbo'
      })

      // Should compose context
      expect(mockContextComposition.composeContext).toHaveBeenCalledWith(
        'user:123,group:456:1,2',
        mockMessages,
        {
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
      )

      // Should generate LLM response
      expect(mockLLMRepository.generate).toHaveBeenCalledWith({
        messages: [
          {
            role: 'system',
            content: expect.stringContaining('serialized context') as string
          },
          {
            role: 'user',
            content: 'Hello, can you help me?'
          }
        ],
        model: 'openai/gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 2048,
        stream: false
      })

      // Should emit events
      expect(mockEventBus.emit).toHaveBeenCalledWith({
        type: 'agentic.response_generated',
        source: 'agentic',
        payload: {
          response: mockLLMResponse,
          context: mockComposedContext
        }
      })

      // Should return response
      expect(result).toEqual(mockLLMResponse)
    })

    it('should use custom generation options', async () => {
      await service.generateResponse({
        centerCoordId: 'user:123,group:456:1,2',
        messages: mockMessages,
        model: 'anthropic/claude-3-opus',
        temperature: 0.5,
        maxTokens: 4096,
        compositionConfig: {
          canvas: {
            enabled: true,
            strategy: 'minimal'
          },
          chat: {
            enabled: false,
            strategy: 'full'
          }
        }
      })

      expect(mockContextComposition.composeContext).toHaveBeenCalledWith(
        'user:123,group:456:1,2',
        mockMessages,
        {
          canvas: {
            enabled: true,
            strategy: 'minimal'
          },
          chat: {
            enabled: false,
            strategy: 'full'
          }
        }
      )

      expect(mockLLMRepository.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'anthropic/claude-3-opus',
          temperature: 0.5,
          maxTokens: 4096
        })
      )
    })

    it('should handle errors gracefully', async () => {
      const error = new Error('LLM error')
      ;(mockLLMRepository.generate as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error)

      await expect(
        service.generateResponse({
          centerCoordId: 'user:123,group:456:1,2',
          messages: mockMessages,
          model: 'openai/gpt-3.5-turbo'
        })
      ).rejects.toThrow('LLM error')

      expect(mockEventBus.emit).toHaveBeenCalledWith({
        type: 'agentic.error',
        source: 'agentic',
        payload: {
          error,
          context: mockComposedContext
        }
      })
    })

    it('should check if repository is configured', async () => {
      ;(mockLLMRepository.isConfigured as ReturnType<typeof vi.fn>).mockReturnValue(false)

      await expect(
        service.generateResponse({
          centerCoordId: 'user:123,group:456:1,2',
          messages: mockMessages,
          model: 'openai/gpt-3.5-turbo'
        })
      ).rejects.toThrow('LLM repository is not configured')
    })
  })

  describe('generateStreamingResponse', () => {
    const mockMessages: ChatMessage[] = [
      {
        id: '1',
        type: 'user',
        content: 'Tell me a story'
      }
    ]

    it('should generate a streaming response', async () => {
      const mockChunks: StreamChunk[] = [
        { content: 'Once upon', isFinished: false },
        { content: ' a time', isFinished: false },
        { content: '', isFinished: true }
      ]

      const generateStreamMock = mockLLMRepository.generateStream as ReturnType<typeof vi.fn>
      generateStreamMock.mockImplementation(async (_params, onChunk) => {
        for (const chunk of mockChunks) {
          (onChunk as (chunk: StreamChunk) => void)(chunk)
        }
        return mockLLMResponse
      })

      const receivedChunks: StreamChunk[] = []
      const result = await service.generateStreamingResponse(
        {
          centerCoordId: 'user:123,group:456:1,2',
          messages: mockMessages,
          model: 'openai/gpt-3.5-turbo'
        },
        (chunk) => {
          receivedChunks.push(chunk)
        }
      )

      expect(receivedChunks).toEqual(mockChunks)
      expect(result).toEqual(mockLLMResponse)

      // Should emit streaming events
      expect(mockEventBus.emit).toHaveBeenCalledWith({
        type: 'agentic.stream_started',
        source: 'agentic',
        payload: {
          context: mockComposedContext
        }
      })
      expect(mockEventBus.emit).toHaveBeenCalledWith({
        type: 'agentic.stream_completed',
        source: 'agentic',
        payload: {
          response: mockLLMResponse,
          context: mockComposedContext
        }
      })
    })

    it('should handle streaming errors', async () => {
      const error = new Error('Stream error')
      const generateStreamMock2 = mockLLMRepository.generateStream as ReturnType<typeof vi.fn>
      generateStreamMock2.mockRejectedValueOnce(error)

      await expect(
        service.generateStreamingResponse(
          {
            centerCoordId: 'user:123,group:456:1,2',
            messages: mockMessages,
            model: 'openai/gpt-3.5-turbo'
          },
          vi.fn()
        )
      ).rejects.toThrow('Stream error')

      expect(mockEventBus.emit).toHaveBeenCalledWith({
        type: 'agentic.stream_error',
        source: 'agentic',
        payload: {
          error,
          context: mockComposedContext
        }
      })
    })
  })

  describe('getAvailableModels', () => {
    it('should return available models from repository', async () => {
      const mockModels = [
        {
          id: 'openai/gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          provider: 'openai',
          contextWindow: 16385,
          maxOutput: 4096
        }
      ]

      ;(mockLLMRepository.listModels as ReturnType<typeof vi.fn>)
        .mockResolvedValue(mockModels)

      const models = await service.getAvailableModels()

      expect(models).toEqual(mockModels)
    })
  })

  describe('isConfigured', () => {
    it('should delegate to repository', () => {
      expect(service.isConfigured()).toBe(true)
      expect(mockLLMRepository.isConfigured).toHaveBeenCalled()
    })
  })
})