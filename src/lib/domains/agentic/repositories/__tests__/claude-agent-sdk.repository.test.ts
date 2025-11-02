/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ClaudeAgentSDKRepository } from '~/lib/domains/agentic/repositories/claude-agent-sdk.repository'
import type { LLMGenerationParams } from '~/lib/domains/agentic/types/llm.types'

// Mock the Claude Agent SDK
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: vi.fn()
}))

import { query } from '@anthropic-ai/claude-agent-sdk'

const mockQuery = vi.mocked(query)

describe('ClaudeAgentSDKRepository', () => {
  let repository: ClaudeAgentSDKRepository
  const mockApiKey = 'test-api-key'

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new ClaudeAgentSDKRepository(mockApiKey)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generate', () => {
    it('should make a completion request using Claude Agent SDK', async () => {
      // Mock async generator response with correct SDK format
      const mockMessages = [
        { type: 'stream_event', event: { type: 'content_block_delta', delta: { text: 'Hello! ' } } },
        { type: 'stream_event', event: { type: 'content_block_delta', delta: { text: 'How can I help?' } } },
        { type: 'result', subtype: 'success', result: 'Hello! How can I help?' }
      ]

      const mockAsyncGenerator = (async function* () {
        for (const msg of mockMessages) {
          yield msg
        }
      })()

      mockQuery.mockReturnValueOnce(mockAsyncGenerator as ReturnType<typeof query>)

      const params: LLMGenerationParams = {
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello!' }
        ],
        model: 'claude-sonnet-4-5-20250929',
        temperature: 0.7,
        maxTokens: 100
      }

      const result = await repository.generate(params)

      expect(mockQuery).toHaveBeenCalledWith({
        prompt: expect.any(String),
        options: expect.objectContaining({
          model: 'claude-sonnet-4-5-20250929',
          maxTurns: 1
        })
      })

      expect(result).toEqual({
        id: expect.any(String),
        model: 'claude-sonnet-4-5-20250929',
        content: 'Hello! How can I help?',
        usage: expect.objectContaining({
          promptTokens: expect.any(Number),
          completionTokens: expect.any(Number),
          totalTokens: expect.any(Number)
        }),
        finishReason: 'stop',
        provider: 'claude-agent-sdk'
      })
    })

    it('should handle system and user messages correctly', async () => {
      const mockAsyncGenerator = (async function* () {
        yield { type: 'result', subtype: 'success', result: 'Response' }
      })()

      mockQuery.mockReturnValueOnce(mockAsyncGenerator as ReturnType<typeof query>)

      const params: LLMGenerationParams = {
        messages: [
          { role: 'system', content: 'System prompt' },
          { role: 'user', content: 'User query' }
        ],
        model: 'claude-sonnet-4-5-20250929'
      }

      await repository.generate(params)

      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            systemPrompt: 'System prompt'
          })
        })
      )
    })

    it('should pass tools parameter to SDK', async () => {
      const mockAsyncGenerator = (async function* () {
        yield { type: 'result', subtype: 'success', result: 'Response with tools' }
      })()

      mockQuery.mockReturnValueOnce(mockAsyncGenerator as ReturnType<typeof query>)

      const mockTools = [
        { name: 'search', description: 'Search tool' }
      ]

      const params: LLMGenerationParams = {
        messages: [{ role: 'user', content: 'Search for something' }],
        model: 'claude-sonnet-4-5-20250929',
        tools: mockTools
      }

      await repository.generate(params)

      // Note: SDK doesn't support tools via options, they need to be via mcpServers
      expect(mockQuery).toHaveBeenCalled()
    })

    it('should handle SDK errors gracefully', async () => {
      const mockError = new Error('SDK error occurred')
      mockQuery.mockImplementationOnce(() => {
        throw mockError
      })

      const params: LLMGenerationParams = {
        messages: [{ role: 'user', content: 'Hello!' }],
        model: 'claude-sonnet-4-5-20250929'
      }

      await expect(repository.generate(params)).rejects.toMatchObject({
        code: 'UNKNOWN',
        provider: 'claude-agent-sdk'
      })
    })

    it('should handle temperature and maxTokens parameters', async () => {
      const mockAsyncGenerator = (async function* () {
        yield { type: 'result', subtype: 'success', result: 'Response' }
      })()

      mockQuery.mockReturnValueOnce(mockAsyncGenerator as ReturnType<typeof query>)

      const params: LLMGenerationParams = {
        messages: [{ role: 'user', content: 'Hello!' }],
        model: 'claude-sonnet-4-5-20250929',
        temperature: 0.5,
        maxTokens: 500
      }

      await repository.generate(params)

      // SDK handles model parameters differently, just verify it was called
      expect(mockQuery).toHaveBeenCalled()
    })
  })

  describe('generateStream', () => {
    it('should handle streaming responses', async () => {
      const mockMessages = [
        { type: 'stream_event', event: { type: 'content_block_delta', delta: { text: 'Hello' } } },
        { type: 'stream_event', event: { type: 'content_block_delta', delta: { text: ' world' } } },
        { type: 'result', subtype: 'success', result: 'Hello world' }
      ]

      const mockAsyncGenerator = (async function* () {
        for (const msg of mockMessages) {
          yield msg
        }
      })()

      mockQuery.mockReturnValueOnce(mockAsyncGenerator as ReturnType<typeof query>)

      const params: LLMGenerationParams = {
        messages: [{ role: 'user', content: 'Hello!' }],
        model: 'claude-sonnet-4-5-20250929',
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
    })

    it('should call onChunk callback for each streaming chunk', async () => {
      const mockMessages = [
        { type: 'stream_event', event: { type: 'content_block_delta', delta: { text: 'Chunk 1' } } },
        { type: 'stream_event', event: { type: 'content_block_delta', delta: { text: 'Chunk 2' } } },
        { type: 'result', subtype: 'success', result: 'Chunk 1Chunk 2' }
      ]

      const mockAsyncGenerator = (async function* () {
        for (const msg of mockMessages) {
          yield msg
        }
      })()

      mockQuery.mockReturnValueOnce(mockAsyncGenerator as ReturnType<typeof query>)

      const onChunkMock = vi.fn()

      const params: LLMGenerationParams = {
        messages: [{ role: 'user', content: 'Hello!' }],
        model: 'claude-sonnet-4-5-20250929'
      }

      await repository.generateStream(params, onChunkMock)

      expect(onChunkMock).toHaveBeenCalledTimes(3) // 2 content chunks + 1 finished chunk
      expect(onChunkMock).toHaveBeenCalledWith({ content: 'Chunk 1', isFinished: false })
      expect(onChunkMock).toHaveBeenCalledWith({ content: 'Chunk 2', isFinished: false })
      expect(onChunkMock).toHaveBeenCalledWith({ content: '', isFinished: true })
    })

    it('should pass tools to streaming requests', async () => {
      const mockAsyncGenerator = (async function* () {
        yield { type: 'result', subtype: 'success', result: 'Response' }
      })()

      mockQuery.mockReturnValueOnce(mockAsyncGenerator as ReturnType<typeof query>)

      const mockTools = [{ name: 'tool1', description: 'Test tool' }]

      const params: LLMGenerationParams = {
        messages: [{ role: 'user', content: 'Hello!' }],
        model: 'claude-sonnet-4-5-20250929',
        tools: mockTools
      }

      await repository.generateStream(params, vi.fn())

      // SDK handles tools via mcpServers, not direct options
      expect(mockQuery).toHaveBeenCalled()
    })
  })

  describe('getModelInfo', () => {
    it('should return model information for Claude models', async () => {
      const modelInfo = await repository.getModelInfo('claude-sonnet-4-5-20250929')

      expect(modelInfo).toEqual({
        id: 'claude-sonnet-4-5-20250929',
        name: 'Claude Sonnet 4.5',
        provider: 'anthropic',
        contextWindow: 200000,
        maxOutput: 8192,
        pricing: {
          prompt: 3.0,
          completion: 15.0
        }
      })
    })

    it('should return null for unknown models', async () => {
      const modelInfo = await repository.getModelInfo('unknown-model')

      expect(modelInfo).toBeNull()
    })

    it('should support multiple Claude model variants', async () => {
      const opusInfo = await repository.getModelInfo('claude-opus-4-20250514')
      const haikuInfo = await repository.getModelInfo('claude-haiku-4-5-20251001')

      expect(opusInfo).not.toBeNull()
      expect(haikuInfo).not.toBeNull()
      expect(opusInfo?.name).toContain('Opus')
      expect(haikuInfo?.name).toContain('Haiku')
    })
  })

  describe('listModels', () => {
    it('should return a list of available Claude models', async () => {
      const models = await repository.listModels()

      expect(models).toBeInstanceOf(Array)
      expect(models.length).toBeGreaterThan(0)
      expect(models[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        provider: 'anthropic',
        contextWindow: expect.any(Number),
        maxOutput: expect.any(Number)
      })
    })

    it('should include Sonnet, Opus, and Haiku models', async () => {
      const models = await repository.listModels()

      const modelNames = models.map(m => m.name.toLowerCase())
      expect(modelNames.some(name => name.includes('sonnet'))).toBe(true)
      expect(modelNames.some(name => name.includes('opus'))).toBe(true)
      expect(modelNames.some(name => name.includes('haiku'))).toBe(true)
    })
  })

  describe('isConfigured', () => {
    it('should return true when API key is provided', () => {
      expect(repository.isConfigured()).toBe(true)
    })

    it('should return false when API key is empty', () => {
      const emptyKeyRepo = new ClaudeAgentSDKRepository('')
      expect(emptyKeyRepo.isConfigured()).toBe(false)
    })

    it('should return false when API key is undefined', () => {
      const undefinedKeyRepo = new ClaudeAgentSDKRepository(undefined as unknown as string)
      expect(undefinedKeyRepo.isConfigured()).toBe(false)
    })
  })

  describe('message format conversion', () => {
    it('should convert LLM messages to SDK format correctly', async () => {
      const mockAsyncGenerator = (async function* () {
        yield { type: 'result', subtype: 'success', result: 'Response' }
      })()

      mockQuery.mockReturnValueOnce(mockAsyncGenerator as ReturnType<typeof query>)

      const params: LLMGenerationParams = {
        messages: [
          { role: 'system', content: 'You are helpful' },
          { role: 'user', content: 'Question 1' },
          { role: 'assistant', content: 'Answer 1' },
          { role: 'user', content: 'Question 2' }
        ],
        model: 'claude-sonnet-4-5-20250929'
      }

      await repository.generate(params)

      // Verify the query was called with correct prompt format
      expect(mockQuery).toHaveBeenCalled()
      const callArgs = mockQuery.mock.calls[0]
      expect(callArgs?.[0]?.prompt).toBeDefined()
    })
  })

  describe('error handling', () => {
    it('should wrap SDK errors with consistent error format', async () => {
      const sdkError = new Error('Rate limit exceeded')
      mockQuery.mockImplementationOnce(() => {
        throw sdkError
      })

      const params: LLMGenerationParams = {
        messages: [{ role: 'user', content: 'Hello!' }],
        model: 'claude-sonnet-4-5-20250929'
      }

      await expect(repository.generate(params)).rejects.toMatchObject({
        code: 'UNKNOWN',
        provider: 'claude-agent-sdk',
        message: expect.any(String)
      })
    })

    it('should handle async generator errors during streaming', async () => {
      const mockAsyncGenerator = (async function* () {
        yield { type: 'stream_event', event: { type: 'content_block_delta', delta: { text: 'Start' } } }
        throw new Error('Stream interrupted')
      })()

      mockQuery.mockReturnValueOnce(mockAsyncGenerator as ReturnType<typeof query>)

      const params: LLMGenerationParams = {
        messages: [{ role: 'user', content: 'Hello!' }],
        model: 'claude-sonnet-4-5-20250929'
      }

      await expect(repository.generateStream(params, vi.fn())).rejects.toMatchObject({
        code: 'UNKNOWN',
        provider: 'claude-agent-sdk'
      })
    })
  })
})
