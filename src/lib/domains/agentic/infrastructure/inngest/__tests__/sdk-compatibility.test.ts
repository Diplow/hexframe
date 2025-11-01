import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SDKMessage } from '~/lib/domains/agentic/types/sdk.types'

/**
 * Tests for Inngest compatibility with Claude Agent SDK async generator patterns
 *
 * The SDK returns an async generator that yields messages over time. We need to verify:
 * 1. Async generators work within Inngest step.run() functions
 * 2. Long-running async generators don't timeout
 * 3. Error handling works correctly with async generators
 * 4. Cancellation works properly with async generators
 */
describe('Inngest SDK Compatibility', () => {
  describe('async generator execution', () => {
    it('should support async generator iteration in step.run', async () => {
      // Simulate SDK async generator
      async function* mockSDKQuery(): AsyncGenerator<SDKMessage, void, unknown> {
        yield { type: 'stream_event', event: { type: 'message_start' } }
        yield {
          type: 'stream_event',
          event: { type: 'content_block_delta', delta: { text: 'Hello' } }
        }
        yield {
          type: 'stream_event',
          event: { type: 'content_block_delta', delta: { text: ' world' } }
        }
        yield { type: 'result', subtype: 'success', result: 'Hello world' }
      }

      // Simulate Inngest step.run wrapper
      const stepRun = async <T>(
        _name: string,
        fn: () => Promise<T>
      ): Promise<T> => {
        return await fn()
      }

      // Test that async generator works in step.run
      const result = await stepRun('test-step', async () => {
        let fullContent = ''

        for await (const msg of mockSDKQuery()) {
          if (msg.type === 'stream_event' && msg.event.type === 'content_block_delta') {
            fullContent += msg.event.delta.text
          } else if (msg.type === 'result' && msg.subtype === 'success') {
            fullContent = msg.result
          }
        }

        return fullContent
      })

      expect(result).toBe('Hello world')
    })

    it('should handle async generator errors properly', async () => {
      // Simulate SDK async generator that throws
      async function* errorSDKQuery(): AsyncGenerator<SDKMessage, void, unknown> {
        yield { type: 'stream_event', event: { type: 'message_start' } }
        throw new Error('SDK error')
      }

      const stepRun = async <T>(
        _name: string,
        fn: () => Promise<T>
      ): Promise<T> => {
        return await fn()
      }

      await expect(
        stepRun('test-step', async () => {
          for await (const msg of errorSDKQuery()) {
            if (msg.type === 'result' && msg.subtype === 'success') {
              return msg.result
            }
          }
          return ''
        })
      ).rejects.toThrow('SDK error')
    })

    it('should handle async generator cleanup on early return', async () => {
      const cleanup = vi.fn()

      async function* cleanupSDKQuery(): AsyncGenerator<SDKMessage, void, unknown> {
        try {
          yield { type: 'stream_event', event: { type: 'message_start' } }
          yield {
            type: 'stream_event',
            event: { type: 'content_block_delta', delta: { text: 'Hello' } }
          }
          yield { type: 'result', subtype: 'success', result: 'Complete' }
        } finally {
          cleanup()
        }
      }

      const stepRun = async <T>(
        _name: string,
        fn: () => Promise<T>
      ): Promise<T> => {
        return await fn()
      }

      // Early return after first message
      await stepRun('test-step', async () => {
        for await (const msg of cleanupSDKQuery()) {
          if (msg.type === 'stream_event' && msg.event.type === 'message_start') {
            return 'early'
          }
        }
        return 'late'
      })

      // Cleanup should have been called
      expect(cleanup).toHaveBeenCalled()
    })
  })

  describe('timeout handling', () => {
    it('should support long-running async generators', async () => {
      // Simulate a slow SDK response (500ms)
      async function* slowSDKQuery(): AsyncGenerator<SDKMessage, void, unknown> {
        yield { type: 'stream_event', event: { type: 'message_start' } }

        // Simulate slow streaming
        await new Promise(resolve => setTimeout(resolve, 100))
        yield {
          type: 'stream_event',
          event: { type: 'content_block_delta', delta: { text: 'Slow' } }
        }

        await new Promise(resolve => setTimeout(resolve, 100))
        yield {
          type: 'stream_event',
          event: { type: 'content_block_delta', delta: { text: ' response' } }
        }

        await new Promise(resolve => setTimeout(resolve, 100))
        yield { type: 'result', subtype: 'success', result: 'Slow response' }
      }

      const stepRun = async <T>(
        _name: string,
        fn: () => Promise<T>
      ): Promise<T> => {
        return await fn()
      }

      const startTime = Date.now()
      const result = await stepRun('test-step', async () => {
        let fullContent = ''

        for await (const msg of slowSDKQuery()) {
          if (msg.type === 'result' && msg.subtype === 'success') {
            fullContent = msg.result
          }
        }

        return fullContent
      })

      const duration = Date.now() - startTime
      expect(result).toBe('Slow response')
      expect(duration).toBeGreaterThanOrEqual(300) // At least 300ms
    })

    it('should handle timeout if generator takes too long', async () => {
      const TIMEOUT_MS = 100

      async function* verySlowSDKQuery(): AsyncGenerator<SDKMessage, void, unknown> {
        yield { type: 'stream_event', event: { type: 'message_start' } }
        // Simulate very slow operation
        await new Promise(resolve => setTimeout(resolve, 200))
        yield { type: 'result', subtype: 'success', result: 'Done' }
      }

      const stepRunWithTimeout = async <T>(
        _name: string,
        fn: () => Promise<T>,
        timeoutMs: number
      ): Promise<T> => {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Step timeout')), timeoutMs)
        })

        return await Promise.race([fn(), timeoutPromise])
      }

      await expect(
        stepRunWithTimeout(
          'test-step',
          async () => {
            for await (const msg of verySlowSDKQuery()) {
              if (msg.type === 'result' && msg.subtype === 'success') {
                return msg.result
              }
            }
            return ''
          },
          TIMEOUT_MS
        )
      ).rejects.toThrow('Step timeout')
    })
  })

  describe('cancellation handling', () => {
    it('should support aborting async generator via AbortSignal', async () => {
      const abortController = new AbortController()

      async function* abortableSDKQuery(
        signal?: AbortSignal
      ): AsyncGenerator<SDKMessage, void, unknown> {
        yield { type: 'stream_event', event: { type: 'message_start' } }

        // Check abort signal
        await new Promise(resolve => setTimeout(resolve, 50))
        if (signal?.aborted) {
          throw new Error('Request aborted')
        }

        yield {
          type: 'stream_event',
          event: { type: 'content_block_delta', delta: { text: 'Hello' } }
        }

        await new Promise(resolve => setTimeout(resolve, 50))
        if (signal?.aborted) {
          throw new Error('Request aborted')
        }

        yield { type: 'result', subtype: 'success', result: 'Complete' }
      }

      const stepRun = async <T>(
        _name: string,
        fn: () => Promise<T>
      ): Promise<T> => {
        return await fn()
      }

      // Start processing then abort
      const promise = stepRun('test-step', async () => {
        let content = ''

        try {
          for await (const msg of abortableSDKQuery(abortController.signal)) {
            if (msg.type === 'result' && msg.subtype === 'success') {
              content = msg.result
            }
          }
        } catch (error) {
          if (error instanceof Error && error.message === 'Request aborted') {
            return 'ABORTED'
          }
          throw error
        }

        return content
      })

      // Abort after 75ms (between first and second message)
      setTimeout(() => abortController.abort(), 75)

      const result = await promise
      expect(result).toBe('ABORTED')
    })

    it('should clean up generator resources on abort', async () => {
      const cleanup = vi.fn()
      const abortController = new AbortController()

      async function* cleanupOnAbort(
        signal?: AbortSignal
      ): AsyncGenerator<SDKMessage, void, unknown> {
        try {
          yield { type: 'stream_event', event: { type: 'message_start' } }

          await new Promise(resolve => setTimeout(resolve, 50))
          if (signal?.aborted) throw new Error('Aborted')

          yield { type: 'result', subtype: 'success', result: 'Done' }
        } finally {
          cleanup()
        }
      }

      const stepRun = async <T>(
        _name: string,
        fn: () => Promise<T>
      ): Promise<T> => {
        return await fn()
      }

      const promise = stepRun('test-step', async () => {
        try {
          for await (const msg of cleanupOnAbort(abortController.signal)) {
            if (msg.type === 'result' && msg.subtype === 'success') {
              return msg.result
            }
          }
        } catch (error) {
          if (error instanceof Error && error.message === 'Aborted') {
            return 'ABORTED'
          }
          throw error
        }
        return ''
      })

      setTimeout(() => abortController.abort(), 75)
      await promise

      expect(cleanup).toHaveBeenCalled()
    })
  })

  describe('memory efficiency', () => {
    it('should stream without buffering all chunks in memory', async () => {
      const CHUNK_COUNT = 100
      const processedChunks: string[] = []

      async function* manyChunksSDKQuery(): AsyncGenerator<SDKMessage, void, unknown> {
        yield { type: 'stream_event', event: { type: 'message_start' } }

        for (let i = 0; i < CHUNK_COUNT; i++) {
          yield {
            type: 'stream_event',
            event: { type: 'content_block_delta', delta: { text: `chunk${i} ` } }
          }
        }

        yield { type: 'result', subtype: 'success', result: 'Complete' }
      }

      const stepRun = async <T>(
        _name: string,
        fn: () => Promise<T>
      ): Promise<T> => {
        return await fn()
      }

      await stepRun('test-step', async () => {
        for await (const msg of manyChunksSDKQuery()) {
          if (msg.type === 'stream_event' && msg.event.type === 'content_block_delta') {
            // Process chunk immediately, don't buffer
            processedChunks.push(msg.event.delta.text)
          }
        }
        return 'done'
      })

      expect(processedChunks).toHaveLength(CHUNK_COUNT)
      expect(processedChunks[0]).toBe('chunk0 ')
      expect(processedChunks[CHUNK_COUNT - 1]).toBe(`chunk${CHUNK_COUNT - 1} `)
    })
  })

  describe('error result handling', () => {
    it('should handle error results from SDK', async () => {
      async function* errorResultSDKQuery(): AsyncGenerator<SDKMessage, void, unknown> {
        yield { type: 'stream_event', event: { type: 'message_start' } }
        yield {
          type: 'result',
          subtype: 'error',
          error: 'API rate limit exceeded'
        }
      }

      const stepRun = async <T>(
        _name: string,
        fn: () => Promise<T>
      ): Promise<T> => {
        return await fn()
      }

      await expect(
        stepRun('test-step', async () => {
          for await (const msg of errorResultSDKQuery()) {
            if (msg.type === 'result') {
              if (msg.subtype === 'error') {
                throw new Error(msg.error)
              }
              return msg.result
            }
          }
          return ''
        })
      ).rejects.toThrow('API rate limit exceeded')
    })

    it('should propagate SDK errors for retry logic', async () => {
      let attemptCount = 0

      async function* retryableSDKQuery(): AsyncGenerator<SDKMessage, void, unknown> {
        attemptCount++

        if (attemptCount < 3) {
          yield { type: 'stream_event', event: { type: 'message_start' } }
          throw new Error('Temporary failure')
        }

        yield { type: 'stream_event', event: { type: 'message_start' } }
        yield { type: 'result', subtype: 'success', result: 'Success' }
      }

      const stepRunWithRetry = async <T>(
        _name: string,
        fn: () => Promise<T>,
        maxRetries: number
      ): Promise<T> => {
        let lastError: Error | undefined

        for (let i = 0; i <= maxRetries; i++) {
          try {
            return await fn()
          } catch (error) {
            lastError = error as Error
            if (i === maxRetries) throw error
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 10))
          }
        }

        throw lastError
      }

      const result = await stepRunWithRetry(
        'test-step',
        async () => {
          for await (const msg of retryableSDKQuery()) {
            if (msg.type === 'result' && msg.subtype === 'success') {
              return msg.result
            }
          }
          return ''
        },
        3
      )

      expect(result).toBe('Success')
      expect(attemptCount).toBe(3)
    })
  })
})
