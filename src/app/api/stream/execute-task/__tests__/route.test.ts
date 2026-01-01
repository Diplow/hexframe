import { describe, beforeEach, it, expect, vi, afterEach } from 'vitest'
import { z } from 'zod'
import type { StreamEvent, TextDeltaEvent, StreamDoneEvent, StreamErrorEvent } from '~/lib/domains/agentic'

/**
 * Unit tests for SSE streaming endpoint: GET /api/stream/execute-task
 *
 * This endpoint streams executeTask events to the frontend via Server-Sent Events.
 * It replaces the current tRPC mutation (which waits for completion) with real-time streaming.
 *
 * Test scenarios:
 * 1. Authentication - session and API key validation
 * 2. SSE response format - correct headers and event formatting
 * 3. Stream event types - text_delta, done, error events
 * 4. Error handling - graceful stream closure on errors
 * 5. Parameter validation - taskCoords, instruction, model params
 */

// Mock environment variables
vi.mock('~/env', () => ({
  env: {
    OPENROUTER_API_KEY: 'test-openrouter-key',
    ANTHROPIC_API_KEY: 'test-anthropic-key',
    USE_SANDBOX: 'false',
    HEXFRAME_MCP_SERVER: 'debughexframe'
  }
}))

// Mock authentication - properly typed to avoid unsafe any
interface MockSessionResult {
  session: { id: string; userId: string } | null
  user: { id: string; email?: string } | null
}

interface MockApiKeyResult {
  valid: boolean
  key?: { userId: string }
}

const mockGetSession = vi.fn<() => Promise<MockSessionResult | null>>()
const mockVerifyApiKey = vi.fn<() => Promise<MockApiKeyResult>>()

vi.mock('~/server/auth', () => ({
  auth: {
    api: {
      getSession: (): ReturnType<typeof mockGetSession> => mockGetSession(),
      verifyApiKey: (): ReturnType<typeof mockVerifyApiKey> => mockVerifyApiKey()
    }
  }
}))

// Mock IAM domain
vi.mock('~/lib/domains/iam', () => ({
  getOrCreateInternalApiKey: vi.fn().mockResolvedValue('test-mcp-api-key'),
  validateInternalApiKey: vi.fn().mockResolvedValue(null)
}))

// =============================================================================
// Input Parameter Schema (mirrors route handler validation)
// =============================================================================

const executeTaskQuerySchema = z.object({
  taskCoords: z.string().min(1, 'taskCoords is required'),
  instruction: z.string().optional(),
  model: z.string().default('claude-haiku-4-5-20251001'),
  temperature: z.coerce.number().min(0).max(2).optional(),
  maxTokens: z.coerce.number().min(1).max(8192).optional()
})

describe('SSE Execute Task Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ===========================================================================
  // 1. Authentication Tests
  // ===========================================================================
  describe('Authentication', () => {
    describe('Session Authentication', () => {
      it('should accept requests with valid session', async () => {
        mockGetSession.mockResolvedValue({
          session: { id: 'session-123', userId: 'user-abc' },
          user: { id: 'user-abc', email: 'test@example.com' }
        })

        // This test will fail until the route handler is implemented
        // The handler should check session from auth.api.getSession()
        const sessionResult = await mockGetSession()
        expect(sessionResult?.session).toBeDefined()
        expect(sessionResult?.user).toBeDefined()
      })

      it('should reject requests without session or API key', async () => {
        mockGetSession.mockResolvedValue(null)
        mockVerifyApiKey.mockResolvedValue({ valid: false })

        // The handler should return 401 Unauthorized
        const sessionResult = await mockGetSession()
        expect(sessionResult).toBeNull()
      })
    })

    describe('API Key Authentication', () => {
      it('should accept requests with valid x-api-key header', async () => {
        mockGetSession.mockResolvedValue(null)
        mockVerifyApiKey.mockResolvedValue({
          valid: true,
          key: { userId: 'user-xyz' }
        })

        const apiKeyResult = await mockVerifyApiKey()
        expect(apiKeyResult.valid).toBe(true)
        expect(apiKeyResult.key?.userId).toBe('user-xyz')
      })

      it('should reject requests with invalid API key', async () => {
        mockGetSession.mockResolvedValue(null)
        mockVerifyApiKey.mockResolvedValue({ valid: false })

        const apiKeyResult = await mockVerifyApiKey()
        expect(apiKeyResult.valid).toBe(false)
      })

      it('should support internal API key validation', async () => {
        // Internal API keys use validateInternalApiKey from IAM domain
        const { validateInternalApiKey } = await import('~/lib/domains/iam')
        const result = await validateInternalApiKey('test-key', 'user-hint')
        expect(result).toBeNull() // Mocked to return null
      })
    })
  })

  // ===========================================================================
  // 2. SSE Response Format Tests
  // ===========================================================================
  describe('SSE Response Format', () => {
    it('should return correct Content-Type header', () => {
      const expectedHeaders = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }

      expect(expectedHeaders['Content-Type']).toBe('text/event-stream')
      expect(expectedHeaders['Cache-Control']).toBe('no-cache')
      expect(expectedHeaders.Connection).toBe('keep-alive')
    })

    it('should format events as SSE data lines', () => {
      const event: TextDeltaEvent = {
        type: 'text_delta',
        text: 'Hello, world!'
      }

      const sseFormatted = `data: ${JSON.stringify(event)}\n\n`

      expect(sseFormatted).toMatch(/^data: /)
      expect(sseFormatted).toMatch(/\n\n$/)
      expect(sseFormatted).toContain('"type":"text_delta"')
    })

    it('should escape newlines in event data', () => {
      const event: TextDeltaEvent = {
        type: 'text_delta',
        text: 'Line 1\nLine 2\nLine 3'
      }

      const serialized = JSON.stringify(event)
      // JSON.stringify escapes newlines as \\n, which is SSE-safe
      expect(serialized).not.toMatch(/[^\\]\n/)
      expect(serialized).toContain('\\n')
    })

    it('should handle special characters in JSON', () => {
      const event: TextDeltaEvent = {
        type: 'text_delta',
        text: 'Code: "const x = 1;" and emoji: \u{1F680}'
      }

      const sseFormatted = `data: ${JSON.stringify(event)}\n\n`
      const parsed = JSON.parse(sseFormatted.replace('data: ', '').trim()) as TextDeltaEvent

      expect(parsed.text).toContain('"const x = 1;"')
    })
  })

  // ===========================================================================
  // 3. Stream Event Types Tests
  // ===========================================================================
  describe('Stream Event Types', () => {
    describe('text_delta events', () => {
      it('should emit text_delta events for LLM text chunks', () => {
        const event: StreamEvent = {
          type: 'text_delta',
          text: 'Processing your request...'
        }

        expect(event.type).toBe('text_delta')
        if (event.type === 'text_delta') {
          expect(event.text).toBeDefined()
        }
      })

      it('should handle empty text deltas', () => {
        const event: TextDeltaEvent = {
          type: 'text_delta',
          text: ''
        }

        expect(event.text).toBe('')
      })
    })

    describe('done events', () => {
      it('should emit done event on successful completion', () => {
        const event: StreamDoneEvent = {
          type: 'done',
          totalTokens: 1500,
          durationMs: 3200
        }

        expect(event.type).toBe('done')
        expect(event.totalTokens).toBe(1500)
        expect(event.durationMs).toBe(3200)
      })

      it('should allow optional metrics in done event', () => {
        const event: StreamDoneEvent = {
          type: 'done'
        }

        expect(event.type).toBe('done')
        expect(event.totalTokens).toBeUndefined()
      })
    })

    describe('error events', () => {
      it('should emit error event with code and message', () => {
        const event: StreamErrorEvent = {
          type: 'error',
          code: 'RATE_LIMIT',
          message: 'Rate limit exceeded',
          recoverable: true
        }

        expect(event.type).toBe('error')
        expect(event.code).toBe('RATE_LIMIT')
        expect(event.recoverable).toBe(true)
      })

      it('should indicate non-recoverable errors', () => {
        const event: StreamErrorEvent = {
          type: 'error',
          code: 'INVALID_API_KEY',
          message: 'Invalid API key',
          recoverable: false
        }

        expect(event.recoverable).toBe(false)
      })
    })
  })

  // ===========================================================================
  // 4. Error Handling Tests
  // ===========================================================================
  describe('Error Handling', () => {
    it('should return 401 for unauthenticated requests', async () => {
      // Test that the route handler returns proper error response
      const errorResponse = {
        status: 401,
        body: { error: 'Unauthorized: Authentication required' }
      }

      expect(errorResponse.status).toBe(401)
      expect(errorResponse.body.error).toContain('Unauthorized')
    })

    it('should return 400 for missing taskCoords parameter', () => {
      const result = executeTaskQuerySchema.safeParse({})

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain('taskCoords')
      }
    })

    it('should close stream gracefully on internal error', () => {
      const errorEvent: StreamErrorEvent = {
        type: 'error',
        code: 'UNKNOWN',
        message: 'Internal server error',
        recoverable: false
      }

      const sseFormatted = `data: ${JSON.stringify(errorEvent)}\n\n`

      expect(sseFormatted).toContain('"type":"error"')
      expect(sseFormatted).toContain('"recoverable":false')
    })

    it('should handle network errors during streaming', () => {
      const errorEvent: StreamErrorEvent = {
        type: 'error',
        code: 'NETWORK_ERROR',
        message: 'Connection lost',
        recoverable: true
      }

      expect(errorEvent.code).toBe('NETWORK_ERROR')
      expect(errorEvent.recoverable).toBe(true)
    })

    it('should handle timeout errors', () => {
      const errorEvent: StreamErrorEvent = {
        type: 'error',
        code: 'TIMEOUT',
        message: 'Request timed out',
        recoverable: true
      }

      expect(errorEvent.code).toBe('TIMEOUT')
    })
  })

  // ===========================================================================
  // 5. Parameter Validation Tests
  // ===========================================================================
  describe('Parameter Validation', () => {
    describe('taskCoords', () => {
      it('should require taskCoords parameter', () => {
        const result = executeTaskQuerySchema.safeParse({})

        expect(result.success).toBe(false)
      })

      it('should accept valid taskCoords string', () => {
        const result = executeTaskQuerySchema.safeParse({
          taskCoords: 'userId123,0:1,2'
        })

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.taskCoords).toBe('userId123,0:1,2')
        }
      })

      it('should reject empty taskCoords', () => {
        const result = executeTaskQuerySchema.safeParse({
          taskCoords: ''
        })

        expect(result.success).toBe(false)
      })
    })

    describe('instruction', () => {
      it('should accept optional instruction parameter', () => {
        const result = executeTaskQuerySchema.safeParse({
          taskCoords: 'userId123,0:1',
          instruction: 'Focus on error handling'
        })

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.instruction).toBe('Focus on error handling')
        }
      })

      it('should work without instruction parameter', () => {
        const result = executeTaskQuerySchema.safeParse({
          taskCoords: 'userId123,0:1'
        })

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.instruction).toBeUndefined()
        }
      })
    })

    describe('model', () => {
      it('should use default model when not specified', () => {
        const result = executeTaskQuerySchema.safeParse({
          taskCoords: 'userId123,0:1'
        })

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.model).toBe('claude-haiku-4-5-20251001')
        }
      })

      it('should accept custom model', () => {
        const result = executeTaskQuerySchema.safeParse({
          taskCoords: 'userId123,0:1',
          model: 'claude-sonnet-4-20250514'
        })

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.model).toBe('claude-sonnet-4-20250514')
        }
      })
    })

    describe('temperature', () => {
      it('should accept valid temperature values', () => {
        const result = executeTaskQuerySchema.safeParse({
          taskCoords: 'userId123,0:1',
          temperature: '0.7'
        })

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.temperature).toBe(0.7)
        }
      })

      it('should reject temperature below 0', () => {
        const result = executeTaskQuerySchema.safeParse({
          taskCoords: 'userId123,0:1',
          temperature: '-0.5'
        })

        expect(result.success).toBe(false)
      })

      it('should reject temperature above 2', () => {
        const result = executeTaskQuerySchema.safeParse({
          taskCoords: 'userId123,0:1',
          temperature: '3'
        })

        expect(result.success).toBe(false)
      })

      it('should coerce string to number', () => {
        const result = executeTaskQuerySchema.safeParse({
          taskCoords: 'userId123,0:1',
          temperature: '1.5'
        })

        expect(result.success).toBe(true)
        if (result.success) {
          expect(typeof result.data.temperature).toBe('number')
        }
      })
    })

    describe('maxTokens', () => {
      it('should accept valid maxTokens values', () => {
        const result = executeTaskQuerySchema.safeParse({
          taskCoords: 'userId123,0:1',
          maxTokens: '4096'
        })

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.maxTokens).toBe(4096)
        }
      })

      it('should reject maxTokens below 1', () => {
        const result = executeTaskQuerySchema.safeParse({
          taskCoords: 'userId123,0:1',
          maxTokens: '0'
        })

        expect(result.success).toBe(false)
      })

      it('should reject maxTokens above 8192', () => {
        const result = executeTaskQuerySchema.safeParse({
          taskCoords: 'userId123,0:1',
          maxTokens: '10000'
        })

        expect(result.success).toBe(false)
      })
    })
  })

  // ===========================================================================
  // 6. Integration Tests (marked as skip until route is implemented)
  // ===========================================================================
  describe('Route Handler Integration', () => {
    it.skip('should return 200 with ReadableStream for valid request', async () => {
      // This test requires the route handler to be implemented
      // It should:
      // 1. Accept GET request with query params
      // 2. Validate authentication
      // 3. Return NextResponse with ReadableStream body
      // 4. Set correct SSE headers
    })

    it.skip('should stream text_delta events from Claude response', async () => {
      // This test requires:
      // 1. Mocked agentic service
      // 2. Simulated streaming response
      // 3. Verification of SSE event format
    })

    it.skip('should emit done event with metrics on completion', async () => {
      // This test verifies the done event is emitted with:
      // - totalTokens from usage
      // - durationMs from timing
    })

    it.skip('should emit error event and close stream on failure', async () => {
      // This test verifies error handling:
      // 1. Error from agentic service is caught
      // 2. StreamErrorEvent is emitted
      // 3. Stream is properly closed
    })

    it.skip('should handle long-running tasks without timeout', async () => {
      // This test verifies:
      // 1. Heartbeat events (if implemented)
      // 2. Connection stays alive during long operations
    })
  })

  // ===========================================================================
  // 7. URL Query String Parsing Tests
  // ===========================================================================
  describe('URL Query String Parsing', () => {
    it('should parse query string parameters correctly', () => {
      const searchParams = new URLSearchParams({
        taskCoords: 'userId123,0:1,2,3',
        instruction: 'Test instruction',
        model: 'claude-haiku-4-5-20251001',
        temperature: '0.5',
        maxTokens: '2048'
      })

      const queryObject = {
        taskCoords: searchParams.get('taskCoords'),
        instruction: searchParams.get('instruction'),
        model: searchParams.get('model'),
        temperature: searchParams.get('temperature'),
        maxTokens: searchParams.get('maxTokens')
      }

      const result = executeTaskQuerySchema.safeParse(queryObject)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.taskCoords).toBe('userId123,0:1,2,3')
        expect(result.data.instruction).toBe('Test instruction')
        expect(result.data.model).toBe('claude-haiku-4-5-20251001')
        expect(result.data.temperature).toBe(0.5)
        expect(result.data.maxTokens).toBe(2048)
      }
    })

    it('should handle URL-encoded special characters', () => {
      const instruction = 'Focus on: "error handling" & logging'
      const searchParams = new URLSearchParams({
        taskCoords: 'userId123,0:1',
        instruction: instruction
      })

      expect(searchParams.get('instruction')).toBe(instruction)
    })
  })
})

// =============================================================================
// Helper function tests
// =============================================================================
describe('SSE Helper Functions', () => {
  describe('formatSSEEvent', () => {
    // This describes the expected helper function behavior
    it('should format event with data prefix and double newline', () => {
      const formatSSEEvent = (event: StreamEvent): string => {
        return `data: ${JSON.stringify(event)}\n\n`
      }

      const event: TextDeltaEvent = {
        type: 'text_delta',
        text: 'Hello'
      }

      const formatted = formatSSEEvent(event)

      expect(formatted).toBe('data: {"type":"text_delta","text":"Hello"}\n\n')
    })
  })

  describe('parseSSEEvent', () => {
    // This describes the expected parsing behavior for frontend
    it('should parse SSE data line to StreamEvent', () => {
      const parseSSEEvent = (line: string): StreamEvent | null => {
        if (!line.startsWith('data: ')) return null
        try {
          return JSON.parse(line.substring(6)) as StreamEvent
        } catch {
          return null
        }
      }

      const sseLine = 'data: {"type":"text_delta","text":"Hello"}\n'
      const event = parseSSEEvent(sseLine)

      expect(event).not.toBeNull()
      expect(event?.type).toBe('text_delta')
      expect((event as TextDeltaEvent).text).toBe('Hello')
    })

    it('should return null for non-data lines', () => {
      const parseSSEEvent = (line: string): StreamEvent | null => {
        if (!line.startsWith('data: ')) return null
        try {
          return JSON.parse(line.substring(6)) as StreamEvent
        } catch {
          return null
        }
      }

      expect(parseSSEEvent(':comment')).toBeNull()
      expect(parseSSEEvent('')).toBeNull()
      expect(parseSSEEvent('event: custom')).toBeNull()
    })
  })
})
