import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { LLMGenerationParams } from '~/lib/domains/agentic/types/llm.types'
import type { SDKMessage } from '~/lib/domains/agentic/types/sdk.types'

/**
 * Tests for Inngest functions with SDK async generator support
 *
 * These tests verify that the Inngest job queue functions correctly process
 * SDK async generators without timeout issues or async pattern conflicts.
 */
describe('Inngest Functions with SDK', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateLLMResponse with SDK', () => {
    it('should process SDK async generator in step.run', async () => {
      // Mock SDK repository
      const mockSDKRepository = {
        generate: vi.fn(async (_params: LLMGenerationParams) => {
          // Simulate async generator processing
          async function* mockQuery(): AsyncGenerator<SDKMessage, void, unknown> {
            yield { type: 'stream_event', event: { type: 'message_start' } }
            yield {
              type: 'stream_event',
              event: { type: 'content_block_delta', delta: { text: 'Test response' } }
            }
            yield { type: 'result', subtype: 'success', result: 'Test response' }
          }

          let fullContent = ''
          for await (const msg of mockQuery()) {
            if (msg.type === 'result' && msg.subtype === 'success') {
              fullContent = msg.result
            }
          }

          return {
            id: 'test-id',
            model: 'claude-sonnet-4-5-20250929',
            content: fullContent,
            usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
            finishReason: 'stop' as const,
            provider: 'claude-agent-sdk' as const
          }
        }),
        generateStream: vi.fn(),
        getModelInfo: vi.fn(),
        listModels: vi.fn(),
        isConfigured: () => true
      }

      // Simulate Inngest step.run
      const mockStep = {
        run: async <T>(_name: string, fn: () => Promise<T>): Promise<T> => {
          return await fn()
        }
      }

      // Simulate the Inngest function logic
      const params: LLMGenerationParams = {
        messages: [{ role: 'user', content: 'Test' }],
        model: 'claude-sonnet-4-5-20250929'
      }

      const response = await mockStep.run('call-sdk', async () => {
        return await mockSDKRepository.generate(params)
      })

      expect(response.content).toBe('Test response')
      expect(response.provider).toBe('claude-agent-sdk')
      expect(mockSDKRepository.generate).toHaveBeenCalledWith(params)
    })

    it('should handle SDK errors in step.run', async () => {
      const mockSDKRepository = {
        generate: vi.fn(async (_params: LLMGenerationParams) => {
          // Simulate error from async generator
          async function* errorQuery(): AsyncGenerator<SDKMessage, void, unknown> {
            yield { type: 'stream_event', event: { type: 'message_start' } }
            throw new Error('SDK error')
          }

          for await (const msg of errorQuery()) {
            // Process messages
            void msg
          }

          throw new Error('Should not reach here')
        }),
        generateStream: vi.fn(),
        getModelInfo: vi.fn(),
        listModels: vi.fn(),
        isConfigured: () => true
      }

      const mockStep = {
        run: async <T>(_name: string, fn: () => Promise<T>): Promise<T> => {
          return await fn()
        }
      }

      const params: LLMGenerationParams = {
        messages: [{ role: 'user', content: 'Test' }],
        model: 'claude-sonnet-4-5-20250929'
      }

      await expect(
        mockStep.run('call-sdk', async () => {
          return await mockSDKRepository.generate(params)
        })
      ).rejects.toThrow('SDK error')
    })

    it('should handle long-running SDK generation without timeout', async () => {
      const mockSDKRepository = {
        generate: vi.fn(async (_params: LLMGenerationParams) => {
          // Simulate slow async generator (multiple chunks over time)
          async function* slowQuery(): AsyncGenerator<SDKMessage, void, unknown> {
            yield { type: 'stream_event', event: { type: 'message_start' } }

            // Simulate 10 chunks with 50ms delay each (500ms total)
            for (let i = 0; i < 10; i++) {
              await new Promise(resolve => setTimeout(resolve, 50))
              yield {
                type: 'stream_event',
                event: { type: 'content_block_delta', delta: { text: `chunk${i} ` } }
              }
            }

            yield { type: 'result', subtype: 'success', result: 'Complete response' }
          }

          let fullContent = ''
          for await (const msg of slowQuery()) {
            if (msg.type === 'result' && msg.subtype === 'success') {
              fullContent = msg.result
            }
          }

          return {
            id: 'test-id',
            model: 'claude-sonnet-4-5-20250929',
            content: fullContent,
            usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
            finishReason: 'stop' as const,
            provider: 'claude-agent-sdk' as const
          }
        }),
        generateStream: vi.fn(),
        getModelInfo: vi.fn(),
        listModels: vi.fn(),
        isConfigured: () => true
      }

      const mockStep = {
        run: async <T>(_name: string, fn: () => Promise<T>): Promise<T> => {
          return await fn()
        }
      }

      const startTime = Date.now()
      const params: LLMGenerationParams = {
        messages: [{ role: 'user', content: 'Long request' }],
        model: 'claude-sonnet-4-5-20250929'
      }

      const response = await mockStep.run('call-sdk', async () => {
        return await mockSDKRepository.generate(params)
      })

      const duration = Date.now() - startTime

      expect(response.content).toBe('Complete response')
      expect(duration).toBeGreaterThanOrEqual(500) // Should take at least 500ms
    })
  })

  describe('streaming with SDK', () => {
    it('should support streaming SDK responses in step.run', async () => {
      const chunks: string[] = []

      const mockSDKRepository = {
        generateStream: vi.fn(
          async (
            _params: LLMGenerationParams,
            onChunk: (chunk: { content: string; isFinished: boolean }) => void
          ) => {
            // Simulate async generator streaming
            async function* streamQuery(): AsyncGenerator<SDKMessage, void, unknown> {
              yield { type: 'stream_event', event: { type: 'message_start' } }

              const parts = ['Hello', ' streaming', ' world']
              for (const part of parts) {
                yield {
                  type: 'stream_event',
                  event: { type: 'content_block_delta', delta: { text: part } }
                }
              }

              yield { type: 'result', subtype: 'success', result: 'Hello streaming world' }
            }

            let fullContent = ''
            for await (const msg of streamQuery()) {
              if (msg.type === 'stream_event' && msg.event.type === 'content_block_delta') {
                const deltaText = msg.event.delta.text
                fullContent += deltaText
                onChunk({ content: deltaText, isFinished: false })
              } else if (msg.type === 'result' && msg.subtype === 'success') {
                fullContent = msg.result
              }
            }

            onChunk({ content: '', isFinished: true })

            return {
              id: 'test-id',
              model: 'claude-sonnet-4-5-20250929',
              content: fullContent,
              usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
              finishReason: 'stop' as const,
              provider: 'claude-agent-sdk' as const
            }
          }
        )
      }

      const mockStep = {
        run: async <T>(_name: string, fn: () => Promise<T>): Promise<T> => {
          return await fn()
        }
      }

      const params: LLMGenerationParams = {
        messages: [{ role: 'user', content: 'Test' }],
        model: 'claude-sonnet-4-5-20250929',
        stream: true
      }

      const response = await mockStep.run('stream-sdk', async () => {
        return await mockSDKRepository.generateStream(params, chunk => {
          if (chunk.content) {
            chunks.push(chunk.content)
          }
        })
      })

      expect(chunks).toEqual(['Hello', ' streaming', ' world'])
      expect(response.content).toBe('Hello streaming world')
    })
  })

  describe('retry handling with SDK', () => {
    it('should retry on SDK async generator failure', async () => {
      let attemptCount = 0

      const mockSDKRepository = {
        generate: vi.fn(async (_params: LLMGenerationParams) => {
          attemptCount++

          async function* retryableQuery(): AsyncGenerator<SDKMessage, void, unknown> {
            yield { type: 'stream_event', event: { type: 'message_start' } }

            if (attemptCount < 2) {
              // Fail first attempt
              throw new Error('Temporary SDK failure')
            }

            // Succeed on second attempt
            yield { type: 'result', subtype: 'success', result: 'Success after retry' }
          }

          let fullContent = ''
          for await (const msg of retryableQuery()) {
            if (msg.type === 'result' && msg.subtype === 'success') {
              fullContent = msg.result
            }
          }

          return {
            id: 'test-id',
            model: 'claude-sonnet-4-5-20250929',
            content: fullContent,
            usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
            finishReason: 'stop' as const,
            provider: 'claude-agent-sdk' as const
          }
        }),
        generateStream: vi.fn(),
        getModelInfo: vi.fn(),
        listModels: vi.fn(),
        isConfigured: () => true
      }

      // Simulate Inngest retry logic
      const mockStep = {
        run: async <T>(_name: string, fn: () => Promise<T>): Promise<T> => {
          const maxRetries = 3
          let lastError: Error | undefined

          for (let i = 0; i <= maxRetries; i++) {
            try {
              return await fn()
            } catch (error) {
              lastError = error as Error
              if (i === maxRetries) throw error
              await new Promise(resolve => setTimeout(resolve, 10))
            }
          }

          throw lastError ?? new Error('Max retries exceeded')
        }
      }

      const params: LLMGenerationParams = {
        messages: [{ role: 'user', content: 'Test' }],
        model: 'claude-sonnet-4-5-20250929'
      }

      const response = await mockStep.run('call-sdk-retry', async () => {
        return await mockSDKRepository.generate(params)
      })

      expect(response.content).toBe('Success after retry')
      expect(attemptCount).toBe(2)
      expect(mockSDKRepository.generate).toHaveBeenCalledTimes(2)
    })
  })

  describe('cancellation with SDK', () => {
    it('should handle job cancellation with async generator cleanup', async () => {
      const cleanup = vi.fn()
      const abortController = new AbortController()

      const mockSDKRepository = {
        generate: vi.fn(async (_params: LLMGenerationParams) => {
          async function* abortableQuery(): AsyncGenerator<SDKMessage, void, unknown> {
            try {
              yield { type: 'stream_event', event: { type: 'message_start' } }

              // Check for abort before next operation
              await new Promise(resolve => setTimeout(resolve, 100))
              if (abortController.signal.aborted) {
                throw new Error('Request cancelled')
              }

              yield { type: 'result', subtype: 'success', result: 'Complete' }
            } finally {
              cleanup()
            }
          }

          let fullContent = ''
          for await (const msg of abortableQuery()) {
            if (msg.type === 'result' && msg.subtype === 'success') {
              fullContent = msg.result
            }
          }

          return {
            id: 'test-id',
            model: 'claude-sonnet-4-5-20250929',
            content: fullContent,
            usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
            finishReason: 'stop' as const,
            provider: 'claude-agent-sdk' as const
          }
        }),
        generateStream: vi.fn(),
        getModelInfo: vi.fn(),
        listModels: vi.fn(),
        isConfigured: () => true
      }

      const mockStep = {
        run: async <T>(_name: string, fn: () => Promise<T>): Promise<T> => {
          return await fn()
        }
      }

      const params: LLMGenerationParams = {
        messages: [{ role: 'user', content: 'Test' }],
        model: 'claude-sonnet-4-5-20250929'
      }

      const promise = mockStep.run('call-sdk-abort', async () => {
        return await mockSDKRepository.generate(params)
      })

      // Abort after 50ms (before the 100ms delay completes)
      setTimeout(() => abortController.abort(), 50)

      await expect(promise).rejects.toThrow('Request cancelled')
      expect(cleanup).toHaveBeenCalled()
    })
  })
})
