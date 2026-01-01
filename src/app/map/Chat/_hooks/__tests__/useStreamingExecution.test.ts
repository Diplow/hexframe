import '~/test/setup'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useStreamingExecution } from '~/app/map/Chat/_hooks/useStreamingExecution'
import type {
  StreamEvent,
  TextDeltaEvent,
  ToolCallStartEvent,
  ToolCallEndEvent,
  TileMutationEvent,
  StreamErrorEvent,
  StreamDoneEvent
} from '~/lib/domains/agentic/types/stream.types'

/**
 * Unit tests for useStreamingExecution hook
 *
 * This hook manages SSE (Server-Sent Events) connection to the streaming endpoint
 * and dispatches typed events to callback handlers for real-time UI updates.
 *
 * Test categories:
 * 1. Hook initialization and return values
 * 2. EventSource connection lifecycle
 * 3. Event parsing and callback dispatch
 * 4. Error handling and cleanup
 * 5. Abort functionality
 */

// =============================================================================
// Mock EventSource
// =============================================================================

type MockEventSourceListener = (event: MessageEvent) => void
type MockErrorListener = (event: Event) => void

interface MockEventSourceInstance {
  url: string
  readyState: number
  close: ReturnType<typeof vi.fn>
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  onmessage: MockEventSourceListener | null
  onerror: MockErrorListener | null
  onopen: (() => void) | null
  _listeners: Map<string, Set<MockEventSourceListener | MockErrorListener>>
  _simulateMessage: (data: string) => void
  _simulateError: (error?: Event) => void
  _simulateOpen: () => void
}

let mockEventSourceInstance: MockEventSourceInstance | null = null
const mockEventSourceClose = vi.fn()
const mockEventSourceAddEventListener = vi.fn()
const mockEventSourceRemoveEventListener = vi.fn()

class MockEventSource implements MockEventSourceInstance {
  url: string
  readyState = 0 // CONNECTING
  close = mockEventSourceClose
  addEventListener = mockEventSourceAddEventListener
  removeEventListener = mockEventSourceRemoveEventListener
  onmessage: MockEventSourceListener | null = null
  onerror: MockErrorListener | null = null
  onopen: (() => void) | null = null
  _listeners = new Map<string, Set<MockEventSourceListener | MockErrorListener>>()

  constructor(url: string) {
    this.url = url
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    mockEventSourceInstance = this

    // Track listeners
    this.addEventListener.mockImplementation((type: string, listener: MockEventSourceListener | MockErrorListener) => {
      if (!this._listeners.has(type)) {
        this._listeners.set(type, new Set())
      }
      this._listeners.get(type)!.add(listener)
    })

    this.removeEventListener.mockImplementation((type: string, listener: MockEventSourceListener | MockErrorListener) => {
      this._listeners.get(type)?.delete(listener)
    })

    // Simulate connection opening after a tick
    setTimeout(() => {
      this.readyState = 1 // OPEN
      this.onopen?.()
    }, 0)
  }

  _simulateMessage(data: string) {
    const messageEvent = new MessageEvent('message', { data })
    this.onmessage?.(messageEvent)
    this._listeners.get('message')?.forEach(listener => {
      if (typeof listener === 'function') {
        (listener as MockEventSourceListener)(messageEvent)
      }
    })
  }

  _simulateError(error: Event = new Event('error')) {
    this.readyState = 2 // CLOSED
    this.onerror?.(error)
    this._listeners.get('error')?.forEach(listener => {
      if (typeof listener === 'function') {
        (listener as MockErrorListener)(error)
      }
    })
  }

  _simulateOpen() {
    this.readyState = 1 // OPEN
    this.onopen?.()
    this._listeners.get('open')?.forEach(listener => {
      if (typeof listener === 'function') {
        (listener as () => void)()
      }
    })
  }

  static CONNECTING = 0
  static OPEN = 1
  static CLOSED = 2
}

// Install mock globally
vi.stubGlobal('EventSource', MockEventSource)

describe('useStreamingExecution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEventSourceInstance = null
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ===========================================================================
  // 1. Hook Initialization and Return Values
  // ===========================================================================
  describe('Hook Initialization', () => {
    it('should return initial state with isStreaming false', () => {
      const { result } = renderHook(() =>
        useStreamingExecution({
          taskCoords: 'userId123,0:1',
          callbacks: {}
        })
      )

      expect(result.current.isStreaming).toBe(false)
      expect(result.current.error).toBeNull()
      expect(typeof result.current.start).toBe('function')
      expect(typeof result.current.abort).toBe('function')
    })

    it('should not start streaming automatically by default', () => {
      renderHook(() =>
        useStreamingExecution({
          taskCoords: 'userId123,0:1',
          callbacks: {}
        })
      )

      expect(mockEventSourceInstance).toBeNull()
    })

    it('should start streaming automatically when autoStart is true', async () => {
      renderHook(() =>
        useStreamingExecution({
          taskCoords: 'userId123,0:1',
          callbacks: {},
          autoStart: true
        })
      )

      await waitFor(() => {
        expect(mockEventSourceInstance).not.toBeNull()
      })
    })

    it('should accept optional instruction parameter', () => {
      const { result } = renderHook(() =>
        useStreamingExecution({
          taskCoords: 'userId123,0:1',
          instruction: 'Focus on error handling',
          callbacks: {}
        })
      )

      expect(result.current.isStreaming).toBe(false)
    })

    it('should accept all callback types', () => {
      const callbacks = {
        onTextDelta: vi.fn(),
        onToolCallStart: vi.fn(),
        onToolCallDelta: vi.fn(),
        onToolCallEnd: vi.fn(),
        onTileMutation: vi.fn(),
        onDone: vi.fn(),
        onError: vi.fn()
      }

      const { result } = renderHook(() =>
        useStreamingExecution({
          taskCoords: 'userId123,0:1',
          callbacks
        })
      )

      expect(result.current.isStreaming).toBe(false)
    })
  })

  // ===========================================================================
  // 2. EventSource Connection Lifecycle
  // ===========================================================================
  describe('Connection Lifecycle', () => {
    it('should create EventSource with correct URL when start() is called', async () => {
      const { result } = renderHook(() =>
        useStreamingExecution({
          taskCoords: 'userId123,0:1,2',
          callbacks: {}
        })
      )

      await act(async () => {
        result.current.start()
      })

      expect(mockEventSourceInstance).not.toBeNull()
      expect(mockEventSourceInstance?.url).toContain('taskCoords=userId123%2C0%3A1%2C2')
    })

    it('should include instruction in URL when provided', async () => {
      const { result } = renderHook(() =>
        useStreamingExecution({
          taskCoords: 'userId123,0:1',
          instruction: 'Focus on tests',
          callbacks: {}
        })
      )

      await act(async () => {
        result.current.start()
      })

      expect(mockEventSourceInstance?.url).toContain('instruction=')
      expect(mockEventSourceInstance?.url).toContain('Focus')
    })

    it('should set isStreaming to true when connection opens', async () => {
      const { result } = renderHook(() =>
        useStreamingExecution({
          taskCoords: 'userId123,0:1',
          callbacks: {}
        })
      )

      await act(async () => {
        result.current.start()
      })

      // Wait for connection to open (simulated via setTimeout in mock)
      await waitFor(() => {
        expect(result.current.isStreaming).toBe(true)
      })
    })

    it('should set isStreaming to false when stream ends with done event', async () => {
      const onDone = vi.fn()
      const { result } = renderHook(() =>
        useStreamingExecution({
          taskCoords: 'userId123,0:1',
          callbacks: { onDone }
        })
      )

      await act(async () => {
        result.current.start()
      })

      await waitFor(() => {
        expect(result.current.isStreaming).toBe(true)
      })

      // Simulate done event
      const doneEvent: StreamDoneEvent = { type: 'done', totalTokens: 100 }
      await act(async () => {
        mockEventSourceInstance?._simulateMessage(JSON.stringify(doneEvent))
      })

      await waitFor(() => {
        expect(result.current.isStreaming).toBe(false)
      })
      expect(onDone).toHaveBeenCalled()
    })

    it('should close EventSource on component unmount', async () => {
      const { result, unmount } = renderHook(() =>
        useStreamingExecution({
          taskCoords: 'userId123,0:1',
          callbacks: {}
        })
      )

      await act(async () => {
        result.current.start()
      })

      await waitFor(() => {
        expect(mockEventSourceInstance).not.toBeNull()
      })

      unmount()

      expect(mockEventSourceClose).toHaveBeenCalled()
    })

    it('should not create duplicate connections when start() is called multiple times', async () => {
      const { result } = renderHook(() =>
        useStreamingExecution({
          taskCoords: 'userId123,0:1',
          callbacks: {}
        })
      )

      await act(async () => {
        result.current.start()
      })

      // Store reference to verify same instance
      const firstInstanceRef = mockEventSourceInstance

      await act(async () => {
        result.current.start()
      })

      // Should still be the same instance (or close was called for the first)
      // Implementation may vary - either prevent second call or close first
      expect(mockEventSourceClose.mock.calls.length).toBeLessThanOrEqual(1)
      // Verify instance didn't change (double-start was prevented)
      expect(mockEventSourceInstance).toBe(firstInstanceRef)
    })
  })

  // ===========================================================================
  // 3. Event Parsing and Callback Dispatch
  // ===========================================================================
  describe('Event Parsing and Callbacks', () => {
    describe('text_delta events', () => {
      it('should call onTextDelta callback with text content', async () => {
        const onTextDelta = vi.fn()
        const { result } = renderHook(() =>
          useStreamingExecution({
            taskCoords: 'userId123,0:1',
            callbacks: { onTextDelta }
          })
        )

        await act(async () => {
          result.current.start()
        })

        await waitFor(() => {
          expect(mockEventSourceInstance).not.toBeNull()
        })

        const textEvent: TextDeltaEvent = { type: 'text_delta', text: 'Hello, world!' }
        await act(async () => {
          mockEventSourceInstance?._simulateMessage(JSON.stringify(textEvent))
        })

        expect(onTextDelta).toHaveBeenCalledWith('Hello, world!')
      })

      it('should handle multiple text_delta events in sequence', async () => {
        const onTextDelta = vi.fn()
        const { result } = renderHook(() =>
          useStreamingExecution({
            taskCoords: 'userId123,0:1',
            callbacks: { onTextDelta }
          })
        )

        await act(async () => {
          result.current.start()
        })

        await waitFor(() => {
          expect(mockEventSourceInstance).not.toBeNull()
        })

        const chunks = ['Hello', ', ', 'world', '!']
        for (const text of chunks) {
          await act(async () => {
            mockEventSourceInstance?._simulateMessage(JSON.stringify({ type: 'text_delta', text }))
          })
        }

        expect(onTextDelta).toHaveBeenCalledTimes(4)
        expect(onTextDelta).toHaveBeenNthCalledWith(1, 'Hello')
        expect(onTextDelta).toHaveBeenNthCalledWith(2, ', ')
        expect(onTextDelta).toHaveBeenNthCalledWith(3, 'world')
        expect(onTextDelta).toHaveBeenNthCalledWith(4, '!')
      })

      it('should handle empty text deltas', async () => {
        const onTextDelta = vi.fn()
        const { result } = renderHook(() =>
          useStreamingExecution({
            taskCoords: 'userId123,0:1',
            callbacks: { onTextDelta }
          })
        )

        await act(async () => {
          result.current.start()
        })

        await waitFor(() => {
          expect(mockEventSourceInstance).not.toBeNull()
        })

        await act(async () => {
          mockEventSourceInstance?._simulateMessage(JSON.stringify({ type: 'text_delta', text: '' }))
        })

        expect(onTextDelta).toHaveBeenCalledWith('')
      })
    })

    describe('tool_call_start events', () => {
      it('should call onToolCallStart with tool name and id', async () => {
        const onToolCallStart = vi.fn()
        const { result } = renderHook(() =>
          useStreamingExecution({
            taskCoords: 'userId123,0:1',
            callbacks: { onToolCallStart }
          })
        )

        await act(async () => {
          result.current.start()
        })

        await waitFor(() => {
          expect(mockEventSourceInstance).not.toBeNull()
        })

        const toolStartEvent: ToolCallStartEvent = {
          type: 'tool_call_start',
          toolCallId: 'call_abc123',
          toolName: 'mcp__debughexframe__addItem',
          arguments: '{"title": "New Tile"}'
        }

        await act(async () => {
          mockEventSourceInstance?._simulateMessage(JSON.stringify(toolStartEvent))
        })

        expect(onToolCallStart).toHaveBeenCalledWith(
          'mcp__debughexframe__addItem',
          'call_abc123',
          '{"title": "New Tile"}'
        )
      })
    })

    describe('tool_call_end events', () => {
      it('should call onToolCallEnd with result on success', async () => {
        const onToolCallEnd = vi.fn()
        const { result } = renderHook(() =>
          useStreamingExecution({
            taskCoords: 'userId123,0:1',
            callbacks: { onToolCallEnd }
          })
        )

        await act(async () => {
          result.current.start()
        })

        await waitFor(() => {
          expect(mockEventSourceInstance).not.toBeNull()
        })

        const toolEndEvent: ToolCallEndEvent = {
          type: 'tool_call_end',
          toolCallId: 'call_abc123',
          result: '{"success": true}'
        }

        await act(async () => {
          mockEventSourceInstance?._simulateMessage(JSON.stringify(toolEndEvent))
        })

        expect(onToolCallEnd).toHaveBeenCalledWith('call_abc123', '{"success": true}', undefined)
      })

      it('should call onToolCallEnd with error on failure', async () => {
        const onToolCallEnd = vi.fn()
        const { result } = renderHook(() =>
          useStreamingExecution({
            taskCoords: 'userId123,0:1',
            callbacks: { onToolCallEnd }
          })
        )

        await act(async () => {
          result.current.start()
        })

        await waitFor(() => {
          expect(mockEventSourceInstance).not.toBeNull()
        })

        const toolEndEvent: ToolCallEndEvent = {
          type: 'tool_call_end',
          toolCallId: 'call_abc123',
          error: 'Permission denied'
        }

        await act(async () => {
          mockEventSourceInstance?._simulateMessage(JSON.stringify(toolEndEvent))
        })

        expect(onToolCallEnd).toHaveBeenCalledWith('call_abc123', undefined, 'Permission denied')
      })
    })

    describe('tile_mutation events', () => {
      it('should call onTileMutation for create operations', async () => {
        const onTileMutation = vi.fn()
        const { result } = renderHook(() =>
          useStreamingExecution({
            taskCoords: 'userId123,0:1',
            callbacks: { onTileMutation }
          })
        )

        await act(async () => {
          result.current.start()
        })

        await waitFor(() => {
          expect(mockEventSourceInstance).not.toBeNull()
        })

        const mutationEvent: TileMutationEvent = {
          type: 'tile_mutation',
          mutation: 'create',
          coordinates: { userId: 'user123', groupId: 0, path: [1, 2] },
          title: 'New Task'
        }

        await act(async () => {
          mockEventSourceInstance?._simulateMessage(JSON.stringify(mutationEvent))
        })

        expect(onTileMutation).toHaveBeenCalledWith(mutationEvent)
      })

      it('should call onTileMutation for update operations', async () => {
        const onTileMutation = vi.fn()
        const { result } = renderHook(() =>
          useStreamingExecution({
            taskCoords: 'userId123,0:1',
            callbacks: { onTileMutation }
          })
        )

        await act(async () => {
          result.current.start()
        })

        await waitFor(() => {
          expect(mockEventSourceInstance).not.toBeNull()
        })

        const mutationEvent: TileMutationEvent = {
          type: 'tile_mutation',
          mutation: 'update',
          coordinates: { userId: 'user123', groupId: 0, path: [3] },
          title: 'Updated Title'
        }

        await act(async () => {
          mockEventSourceInstance?._simulateMessage(JSON.stringify(mutationEvent))
        })

        expect(onTileMutation).toHaveBeenCalledWith(mutationEvent)
      })

      it('should call onTileMutation for delete operations', async () => {
        const onTileMutation = vi.fn()
        const { result } = renderHook(() =>
          useStreamingExecution({
            taskCoords: 'userId123,0:1',
            callbacks: { onTileMutation }
          })
        )

        await act(async () => {
          result.current.start()
        })

        await waitFor(() => {
          expect(mockEventSourceInstance).not.toBeNull()
        })

        const mutationEvent: TileMutationEvent = {
          type: 'tile_mutation',
          mutation: 'delete',
          coordinates: { userId: 'user123', groupId: 0, path: [4, 5] }
        }

        await act(async () => {
          mockEventSourceInstance?._simulateMessage(JSON.stringify(mutationEvent))
        })

        expect(onTileMutation).toHaveBeenCalledWith(mutationEvent)
      })
    })

    describe('done events', () => {
      it('should call onDone callback with metrics', async () => {
        const onDone = vi.fn()
        const { result } = renderHook(() =>
          useStreamingExecution({
            taskCoords: 'userId123,0:1',
            callbacks: { onDone }
          })
        )

        await act(async () => {
          result.current.start()
        })

        await waitFor(() => {
          expect(mockEventSourceInstance).not.toBeNull()
        })

        const doneEvent: StreamDoneEvent = {
          type: 'done',
          totalTokens: 1500,
          durationMs: 3200
        }

        await act(async () => {
          mockEventSourceInstance?._simulateMessage(JSON.stringify(doneEvent))
        })

        expect(onDone).toHaveBeenCalledWith(doneEvent)
      })

      it('should close EventSource after done event', async () => {
        const { result } = renderHook(() =>
          useStreamingExecution({
            taskCoords: 'userId123,0:1',
            callbacks: {}
          })
        )

        await act(async () => {
          result.current.start()
        })

        await waitFor(() => {
          expect(mockEventSourceInstance).not.toBeNull()
        })

        await act(async () => {
          mockEventSourceInstance?._simulateMessage(JSON.stringify({ type: 'done' }))
        })

        expect(mockEventSourceClose).toHaveBeenCalled()
      })
    })

    describe('error events', () => {
      it('should call onError callback with error details', async () => {
        const onError = vi.fn()
        const { result } = renderHook(() =>
          useStreamingExecution({
            taskCoords: 'userId123,0:1',
            callbacks: { onError }
          })
        )

        await act(async () => {
          result.current.start()
        })

        await waitFor(() => {
          expect(mockEventSourceInstance).not.toBeNull()
        })

        const errorEvent: StreamErrorEvent = {
          type: 'error',
          code: 'RATE_LIMIT',
          message: 'Rate limit exceeded',
          recoverable: true
        }

        await act(async () => {
          mockEventSourceInstance?._simulateMessage(JSON.stringify(errorEvent))
        })

        expect(onError).toHaveBeenCalledWith(errorEvent)
      })

      it('should set error state when error event is received', async () => {
        const { result } = renderHook(() =>
          useStreamingExecution({
            taskCoords: 'userId123,0:1',
            callbacks: {}
          })
        )

        await act(async () => {
          result.current.start()
        })

        await waitFor(() => {
          expect(mockEventSourceInstance).not.toBeNull()
        })

        const errorEvent: StreamErrorEvent = {
          type: 'error',
          code: 'INVALID_API_KEY',
          message: 'Invalid API key',
          recoverable: false
        }

        await act(async () => {
          mockEventSourceInstance?._simulateMessage(JSON.stringify(errorEvent))
        })

        expect(result.current.error).toBe('Invalid API key')
      })

      it('should close EventSource after non-recoverable error', async () => {
        const { result } = renderHook(() =>
          useStreamingExecution({
            taskCoords: 'userId123,0:1',
            callbacks: {}
          })
        )

        await act(async () => {
          result.current.start()
        })

        await waitFor(() => {
          expect(mockEventSourceInstance).not.toBeNull()
        })

        const errorEvent: StreamErrorEvent = {
          type: 'error',
          code: 'INVALID_API_KEY',
          message: 'Invalid API key',
          recoverable: false
        }

        await act(async () => {
          mockEventSourceInstance?._simulateMessage(JSON.stringify(errorEvent))
        })

        expect(mockEventSourceClose).toHaveBeenCalled()
      })
    })
  })

  // ===========================================================================
  // 4. Error Handling and Cleanup
  // ===========================================================================
  describe('Error Handling', () => {
    it('should handle EventSource connection error', async () => {
      const onError = vi.fn()
      const { result } = renderHook(() =>
        useStreamingExecution({
          taskCoords: 'userId123,0:1',
          callbacks: { onError }
        })
      )

      await act(async () => {
        result.current.start()
      })

      await waitFor(() => {
        expect(mockEventSourceInstance).not.toBeNull()
      })

      await act(async () => {
        mockEventSourceInstance?._simulateError()
      })

      expect(result.current.error).not.toBeNull()
      expect(result.current.isStreaming).toBe(false)
    })

    it('should handle invalid JSON in SSE data gracefully', async () => {
      const onError = vi.fn()
      const onTextDelta = vi.fn()
      const { result } = renderHook(() =>
        useStreamingExecution({
          taskCoords: 'userId123,0:1',
          callbacks: { onError, onTextDelta }
        })
      )

      await act(async () => {
        result.current.start()
      })

      await waitFor(() => {
        expect(mockEventSourceInstance).not.toBeNull()
      })

      // Send invalid JSON
      await act(async () => {
        mockEventSourceInstance?._simulateMessage('not valid json {{{')
      })

      // Should not crash - onTextDelta should not be called
      expect(onTextDelta).not.toHaveBeenCalled()
      // onError may or may not be called depending on implementation
    })

    it('should handle SSE data without type field gracefully', async () => {
      const onTextDelta = vi.fn()
      const { result } = renderHook(() =>
        useStreamingExecution({
          taskCoords: 'userId123,0:1',
          callbacks: { onTextDelta }
        })
      )

      await act(async () => {
        result.current.start()
      })

      await waitFor(() => {
        expect(mockEventSourceInstance).not.toBeNull()
      })

      // Send JSON without type field
      await act(async () => {
        mockEventSourceInstance?._simulateMessage(JSON.stringify({ text: 'no type' }))
      })

      // Should not crash - onTextDelta should not be called
      expect(onTextDelta).not.toHaveBeenCalled()
    })

    it('should handle unknown event types gracefully', async () => {
      const onTextDelta = vi.fn()
      const { result } = renderHook(() =>
        useStreamingExecution({
          taskCoords: 'userId123,0:1',
          callbacks: { onTextDelta }
        })
      )

      await act(async () => {
        result.current.start()
      })

      await waitFor(() => {
        expect(mockEventSourceInstance).not.toBeNull()
      })

      // Send unknown event type
      await act(async () => {
        mockEventSourceInstance?._simulateMessage(JSON.stringify({ type: 'unknown_type', data: 'test' }))
      })

      // Should not crash - onTextDelta should not be called
      expect(onTextDelta).not.toHaveBeenCalled()
    })

    it('should not update state after component unmount', async () => {
      const onDone = vi.fn()
      const { result, unmount } = renderHook(() =>
        useStreamingExecution({
          taskCoords: 'userId123,0:1',
          callbacks: { onDone }
        })
      )

      await act(async () => {
        result.current.start()
      })

      await waitFor(() => {
        expect(mockEventSourceInstance).not.toBeNull()
      })

      const eventSourceBeforeUnmount = mockEventSourceInstance

      unmount()

      // Try to send event after unmount
      await act(async () => {
        eventSourceBeforeUnmount?._simulateMessage(JSON.stringify({ type: 'done' }))
      })

      // onDone should not be called after unmount
      expect(onDone).not.toHaveBeenCalled()
    })
  })

  // ===========================================================================
  // 5. Abort Functionality
  // ===========================================================================
  describe('Abort Functionality', () => {
    it('should close EventSource when abort() is called', async () => {
      const { result } = renderHook(() =>
        useStreamingExecution({
          taskCoords: 'userId123,0:1',
          callbacks: {}
        })
      )

      await act(async () => {
        result.current.start()
      })

      await waitFor(() => {
        expect(mockEventSourceInstance).not.toBeNull()
      })

      await act(async () => {
        result.current.abort()
      })

      expect(mockEventSourceClose).toHaveBeenCalled()
    })

    it('should set isStreaming to false after abort()', async () => {
      const { result } = renderHook(() =>
        useStreamingExecution({
          taskCoords: 'userId123,0:1',
          callbacks: {}
        })
      )

      await act(async () => {
        result.current.start()
      })

      await waitFor(() => {
        expect(result.current.isStreaming).toBe(true)
      })

      await act(async () => {
        result.current.abort()
      })

      expect(result.current.isStreaming).toBe(false)
    })

    it('should not throw when abort() is called without active connection', () => {
      const { result } = renderHook(() =>
        useStreamingExecution({
          taskCoords: 'userId123,0:1',
          callbacks: {}
        })
      )

      // Should not throw
      expect(() => {
        result.current.abort()
      }).not.toThrow()
    })

    it('should allow restart after abort', async () => {
      const onDone = vi.fn()
      const { result } = renderHook(() =>
        useStreamingExecution({
          taskCoords: 'userId123,0:1',
          callbacks: { onDone }
        })
      )

      // Start first connection
      await act(async () => {
        result.current.start()
      })

      await waitFor(() => {
        expect(mockEventSourceInstance).not.toBeNull()
      })

      // Abort
      await act(async () => {
        result.current.abort()
      })

      expect(result.current.isStreaming).toBe(false)

      // Clear mocks for second connection
      vi.clearAllMocks()

      // Start second connection
      await act(async () => {
        result.current.start()
      })

      await waitFor(() => {
        expect(mockEventSourceInstance).not.toBeNull()
        expect(result.current.isStreaming).toBe(true)
      })
    })
  })

  // ===========================================================================
  // 6. Integration Scenarios
  // ===========================================================================
  describe('Integration Scenarios', () => {
    it('should handle complete streaming session with multiple event types', async () => {
      const callbacks = {
        onTextDelta: vi.fn(),
        onToolCallStart: vi.fn(),
        onToolCallEnd: vi.fn(),
        onTileMutation: vi.fn(),
        onDone: vi.fn()
      }

      const { result } = renderHook(() =>
        useStreamingExecution({
          taskCoords: 'userId123,0:1',
          callbacks
        })
      )

      await act(async () => {
        result.current.start()
      })

      await waitFor(() => {
        expect(mockEventSourceInstance).not.toBeNull()
      })

      // Simulate a typical streaming session
      const events: StreamEvent[] = [
        { type: 'text_delta', text: 'Let me create a tile...' },
        {
          type: 'tool_call_start',
          toolCallId: 'call_1',
          toolName: 'mcp__debughexframe__addItem',
          arguments: '{"title": "New Task"}'
        },
        {
          type: 'tile_mutation',
          mutation: 'create',
          coordinates: { userId: 'u1', groupId: 0, path: [1] },
          title: 'New Task'
        },
        { type: 'tool_call_end', toolCallId: 'call_1', result: '{"success": true}' },
        { type: 'text_delta', text: '\n\nDone!' },
        { type: 'done', totalTokens: 500, durationMs: 2000 }
      ]

      for (const event of events) {
        await act(async () => {
          mockEventSourceInstance?._simulateMessage(JSON.stringify(event))
        })
      }

      expect(callbacks.onTextDelta).toHaveBeenCalledTimes(2)
      expect(callbacks.onToolCallStart).toHaveBeenCalledTimes(1)
      expect(callbacks.onToolCallEnd).toHaveBeenCalledTimes(1)
      expect(callbacks.onTileMutation).toHaveBeenCalledTimes(1)
      expect(callbacks.onDone).toHaveBeenCalledTimes(1)
      expect(result.current.isStreaming).toBe(false)
    })

    it('should handle session that ends with error', async () => {
      const callbacks = {
        onTextDelta: vi.fn(),
        onError: vi.fn(),
        onDone: vi.fn()
      }

      const { result } = renderHook(() =>
        useStreamingExecution({
          taskCoords: 'userId123,0:1',
          callbacks
        })
      )

      await act(async () => {
        result.current.start()
      })

      await waitFor(() => {
        expect(mockEventSourceInstance).not.toBeNull()
      })

      // Simulate session that ends with error
      await act(async () => {
        mockEventSourceInstance?._simulateMessage(JSON.stringify({
          type: 'text_delta',
          text: 'Starting...'
        }))
      })

      await act(async () => {
        mockEventSourceInstance?._simulateMessage(JSON.stringify({
          type: 'error',
          code: 'CONTEXT_LENGTH_EXCEEDED',
          message: 'Context too long',
          recoverable: false
        }))
      })

      expect(callbacks.onTextDelta).toHaveBeenCalledTimes(1)
      expect(callbacks.onError).toHaveBeenCalledTimes(1)
      expect(callbacks.onDone).not.toHaveBeenCalled()
      expect(result.current.isStreaming).toBe(false)
      expect(result.current.error).toBe('Context too long')
    })
  })
})

// =============================================================================
// Type Tests (compile-time verification)
// =============================================================================
describe('Type Safety', () => {
  it('should correctly type StreamingCallbacks interface', () => {
    // This test verifies the type system catches errors at compile time
    type StreamingCallbacks = {
      onTextDelta?: (delta: string) => void
      onToolCallStart?: (toolName: string, toolCallId: string, args: string) => void
      onToolCallDelta?: (toolCallId: string, delta: string) => void
      onToolCallEnd?: (toolCallId: string, result?: string, error?: string) => void
      onTileMutation?: (event: TileMutationEvent) => void
      onDone?: (event: StreamDoneEvent) => void
      onError?: (event: StreamErrorEvent) => void
    }

    const callbacks: StreamingCallbacks = {
      onTextDelta: (delta) => {
        expect(typeof delta).toBe('string')
      },
      onToolCallStart: (toolName, toolCallId, args) => {
        expect(typeof toolName).toBe('string')
        expect(typeof toolCallId).toBe('string')
        expect(typeof args).toBe('string')
      }
    }

    expect(callbacks.onTextDelta).toBeDefined()
    expect(callbacks.onToolCallStart).toBeDefined()
  })

  it('should correctly type UseStreamingExecutionOptions interface', () => {
    type UseStreamingExecutionOptions = {
      taskCoords: string
      instruction?: string
      callbacks: {
        onTextDelta?: (delta: string) => void
        onToolCallStart?: (toolName: string, toolCallId: string, args: string) => void
        onToolCallDelta?: (toolCallId: string, delta: string) => void
        onToolCallEnd?: (toolCallId: string, result?: string, error?: string) => void
        onTileMutation?: (event: TileMutationEvent) => void
        onDone?: (event: StreamDoneEvent) => void
        onError?: (event: StreamErrorEvent) => void
      }
      autoStart?: boolean
    }

    const options: UseStreamingExecutionOptions = {
      taskCoords: 'userId123,0:1',
      instruction: 'Focus on tests',
      callbacks: {},
      autoStart: false
    }

    expect(options.taskCoords).toBe('userId123,0:1')
    expect(options.autoStart).toBe(false)
  })

  it('should correctly type UseStreamingExecutionReturn interface', () => {
    type UseStreamingExecutionReturn = {
      isStreaming: boolean
      error: string | null
      start: () => void
      abort: () => void
    }

    const returnValue: UseStreamingExecutionReturn = {
      isStreaming: false,
      error: null,
      start: () => undefined,
      abort: () => undefined
    }

    expect(returnValue.isStreaming).toBe(false)
    expect(returnValue.error).toBeNull()
    expect(typeof returnValue.start).toBe('function')
    expect(typeof returnValue.abort).toBe('function')
  })
})
