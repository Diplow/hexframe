import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AgenticService } from '~/lib/domains/agentic/services/agentic.service'
import type { ILLMRepository } from '~/lib/domains/agentic/repositories/llm.repository.interface'
import type { ContextCompositionService } from '~/lib/domains/agentic/services/context-composition.service'
import type { EventBus } from '~/lib/utils/event-bus'
import type { ComposedContext, LLMResponse, StreamChunk, ChatMessageContract } from '~/lib/domains/agentic/types'
import { createMockMapContext } from '~/lib/domains/agentic/services/__tests__/__fixtures__/context-mocks'

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
    const mockMessages: ChatMessageContract[] = [
      {
        id: '1',
        type: 'user',
        content: 'Hello, can you help me?'
      }
    ]

    it('should generate a response with composed context', async () => {
      const result = await service.generateResponse({
        mapContext: createMockMapContext(),
        messages: mockMessages,
        model: 'openai/gpt-3.5-turbo'
      })

      // Should compose context with MapContext
      expect(mockContextComposition.composeContext).toHaveBeenCalledWith(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          center: expect.any(Object),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          parent: expect.any(Object),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          composed: expect.any(Array),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          children: expect.any(Array),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          grandchildren: expect.any(Array)
        }),
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
          context: mockComposedContext,
          personality: 'system-prompt'
        }
      })

      // Should return response
      expect(result).toEqual(mockLLMResponse)
    })

    it('should use custom generation options', async () => {
      await service.generateResponse({
        mapContext: createMockMapContext(),
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

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect(mockContextComposition.composeContext).toHaveBeenCalledWith(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          center: expect.any(Object),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          parent: expect.any(Object),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          composed: expect.any(Array),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          children: expect.any(Array),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          grandchildren: expect.any(Array)
        }),
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

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
          mapContext: createMockMapContext(),
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
          mapContext: createMockMapContext(),
          messages: mockMessages,
          model: 'openai/gpt-3.5-turbo'
        })
      ).rejects.toThrow('LLM repository is not configured')
    })
  })

  describe('generateStreamingResponse', () => {
    const mockMessages: ChatMessageContract[] = [
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
          mapContext: createMockMapContext(),
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
          context: mockComposedContext,
          personality: 'system-prompt'
        }
      })
      expect(mockEventBus.emit).toHaveBeenCalledWith({
        type: 'agentic.stream_completed',
        source: 'agentic',
        payload: {
          response: mockLLMResponse,
          context: mockComposedContext,
          personality: 'system-prompt'
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
            mapContext: createMockMapContext(),
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
          title: 'GPT-3.5 Turbo',
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

  describe('generateResponse with tools', () => {
    const mockMessages: ChatMessageContract[] = [
      {
        id: '1',
        type: 'user',
        content: 'Help me analyze this data'
      }
    ]

    it('should pass tools to LLM repository when provided', async () => {
      const mockTools = [
        {
          name: 'search',
          description: 'Search the knowledge base',
          inputSchema: { type: 'object', properties: {} },
          execute: async () => ({ result: 'test' })
        },
        {
          name: 'calculate',
          description: 'Perform calculations',
          inputSchema: { type: 'object', properties: {} },
          execute: async () => ({ result: 42 })
        }
      ]

      await service.generateResponse({
        mapContext: createMockMapContext(),
        messages: mockMessages,
        model: 'openai/gpt-3.5-turbo',
        tools: mockTools
      })

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect(mockLLMRepository.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: mockTools
        })
      )
    })

    it('should not pass tools when not provided', async () => {
      await service.generateResponse({
        mapContext: createMockMapContext(),
        messages: mockMessages,
        model: 'openai/gpt-3.5-turbo'
      })

      const generateMock = mockLLMRepository.generate as ReturnType<typeof vi.fn>
      const callArgs = generateMock.mock.calls[0]?.[0] as Record<string, unknown> | undefined
      expect(callArgs).toBeDefined()
      expect(callArgs).not.toHaveProperty('tools')
    })

    it('should pass empty tools array when provided', async () => {
      await service.generateResponse({
        mapContext: createMockMapContext(),
        messages: mockMessages,
        model: 'openai/gpt-3.5-turbo',
        tools: []
      })

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect(mockLLMRepository.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: []
        })
      )
    })
  })

  describe('createSubagent', () => {
    const mockSubagentConfig = {
      description: 'A test subagent for data analysis',
      tools: ['search', 'calculate'],
      prompt: 'You are a data analysis expert. Help users analyze their data.'
    }

    it('should create a subagent with the provided configuration', () => {
      const subagentId = service.createSubagent(mockSubagentConfig)

      expect(subagentId).toEqual(expect.stringMatching(/^subagent-[a-z0-9-]+$/))
    })

    it('should store subagent configuration for later use', () => {
      const subagentId = service.createSubagent(mockSubagentConfig)
      const config = service.getSubagentConfig(subagentId)

      expect(config).toEqual(mockSubagentConfig)
    })

    it('should generate unique IDs for multiple subagents', () => {
      const id1 = service.createSubagent(mockSubagentConfig)
      const id2 = service.createSubagent(mockSubagentConfig)
      const id3 = service.createSubagent(mockSubagentConfig)

      expect(id1).not.toBe(id2)
      expect(id2).not.toBe(id3)
      expect(id1).not.toBe(id3)
    })

    it('should create subagent with minimal configuration', () => {
      const minimalConfig = {
        description: 'Minimal subagent',
        prompt: 'Help the user'
      }

      const subagentId = service.createSubagent(minimalConfig)
      const config = service.getSubagentConfig(subagentId)

      expect(config).toEqual(minimalConfig)
    })

    it('should create subagent with all optional fields', () => {
      const fullConfig = {
        description: 'Full featured subagent',
        tools: ['tool1', 'tool2'],
        disallowedTools: ['dangerous-tool'],
        prompt: 'Advanced prompt',
        model: 'sonnet' as const
      }

      const subagentId = service.createSubagent(fullConfig)
      const config = service.getSubagentConfig(subagentId)

      expect(config).toEqual(fullConfig)
    })

    it('should throw error when retrieving non-existent subagent', () => {
      expect(() => service.getSubagentConfig('non-existent-id'))
        .toThrow('Subagent not found: non-existent-id')
    })
  })
})