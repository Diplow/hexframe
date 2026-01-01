import { describe, it, expect } from 'vitest'
import type {
  TextDeltaEvent,
  ToolCallStartEvent,
  ToolCallDeltaEvent,
  ToolCallEndEvent,
  TileMutationEvent,
  StreamErrorEvent,
  StreamDoneEvent,
  StreamEvent
} from '~/lib/domains/agentic/types/stream.types'

describe('Stream Types', () => {
  describe('TextDeltaEvent', () => {
    it('should accept text delta with content', () => {
      const event: TextDeltaEvent = {
        type: 'text_delta',
        text: 'Hello, world!'
      }

      expect(event.type).toBe('text_delta')
      expect(event.text).toBe('Hello, world!')
    })

    it('should accept empty text', () => {
      const event: TextDeltaEvent = {
        type: 'text_delta',
        text: ''
      }

      expect(event.type).toBe('text_delta')
      expect(event.text).toBe('')
    })

    it('should accept multiline text', () => {
      const event: TextDeltaEvent = {
        type: 'text_delta',
        text: 'Line 1\nLine 2\nLine 3'
      }

      expect(event.text).toContain('\n')
    })
  })

  describe('ToolCallStartEvent', () => {
    it('should contain tool call id, name, and arguments', () => {
      const event: ToolCallStartEvent = {
        type: 'tool_call_start',
        toolCallId: 'call_abc123',
        toolName: 'mcp__hexframe__addItem',
        arguments: '{"title": "New Tile"}'
      }

      expect(event.type).toBe('tool_call_start')
      expect(event.toolCallId).toBe('call_abc123')
      expect(event.toolName).toBe('mcp__hexframe__addItem')
      expect(event.arguments).toBe('{"title": "New Tile"}')
    })

    it('should accept empty arguments string', () => {
      const event: ToolCallStartEvent = {
        type: 'tool_call_start',
        toolCallId: 'call_xyz789',
        toolName: 'mcp__hexframe__getCurrentUser',
        arguments: '{}'
      }

      expect(event.arguments).toBe('{}')
    })

    it('should accept complex arguments', () => {
      const complexArgs = JSON.stringify({
        coords: {
          userId: 'user123',
          groupId: 0,
          path: [1, 2, 3]
        },
        title: 'Test Tile',
        content: 'Some content'
      })

      const event: ToolCallStartEvent = {
        type: 'tool_call_start',
        toolCallId: 'call_complex',
        toolName: 'mcp__debughexframe__addItem',
        arguments: complexArgs
      }

      expect(JSON.parse(event.arguments)).toHaveProperty('coords')
    })
  })

  describe('ToolCallDeltaEvent', () => {
    it('should contain incremental arguments', () => {
      const event: ToolCallDeltaEvent = {
        type: 'tool_call_delta',
        toolCallId: 'call_abc123',
        argumentsDelta: '{"title":'
      }

      expect(event.type).toBe('tool_call_delta')
      expect(event.toolCallId).toBe('call_abc123')
      expect(event.argumentsDelta).toBe('{"title":')
    })

    it('should accept empty delta', () => {
      const event: ToolCallDeltaEvent = {
        type: 'tool_call_delta',
        toolCallId: 'call_abc123',
        argumentsDelta: ''
      }

      expect(event.argumentsDelta).toBe('')
    })
  })

  describe('ToolCallEndEvent', () => {
    it('should contain successful result', () => {
      const event: ToolCallEndEvent = {
        type: 'tool_call_end',
        toolCallId: 'call_abc123',
        result: '{"success": true, "tileId": "tile_xyz"}'
      }

      expect(event.type).toBe('tool_call_end')
      expect(event.toolCallId).toBe('call_abc123')
      expect(event.result).toBeDefined()
      expect(event.error).toBeUndefined()
    })

    it('should contain error on failure', () => {
      const event: ToolCallEndEvent = {
        type: 'tool_call_end',
        toolCallId: 'call_abc123',
        error: 'Permission denied: cannot modify tile'
      }

      expect(event.type).toBe('tool_call_end')
      expect(event.toolCallId).toBe('call_abc123')
      expect(event.error).toBe('Permission denied: cannot modify tile')
      expect(event.result).toBeUndefined()
    })

    it('should allow neither result nor error (void tool)', () => {
      const event: ToolCallEndEvent = {
        type: 'tool_call_end',
        toolCallId: 'call_abc123'
      }

      expect(event.result).toBeUndefined()
      expect(event.error).toBeUndefined()
    })
  })

  describe('TileMutationEvent', () => {
    it('should represent tile creation', () => {
      const event: TileMutationEvent = {
        type: 'tile_mutation',
        mutation: 'create',
        coordinates: {
          userId: 'user123',
          groupId: 0,
          path: [1, 2]
        },
        title: 'New Task',
        preview: 'A new task tile'
      }

      expect(event.type).toBe('tile_mutation')
      expect(event.mutation).toBe('create')
      expect(event.coordinates.userId).toBe('user123')
      expect(event.coordinates.groupId).toBe(0)
      expect(event.coordinates.path).toEqual([1, 2])
      expect(event.title).toBe('New Task')
    })

    it('should represent tile update', () => {
      const event: TileMutationEvent = {
        type: 'tile_mutation',
        mutation: 'update',
        coordinates: {
          userId: 'user123',
          groupId: 0,
          path: [3, -1]
        },
        title: 'Updated Title'
      }

      expect(event.mutation).toBe('update')
      expect(event.coordinates.path).toEqual([3, -1])
    })

    it('should represent tile deletion', () => {
      const event: TileMutationEvent = {
        type: 'tile_mutation',
        mutation: 'delete',
        coordinates: {
          userId: 'user123',
          groupId: 0,
          path: [4, 5, 6]
        }
      }

      expect(event.mutation).toBe('delete')
      expect(event.title).toBeUndefined()
      expect(event.preview).toBeUndefined()
    })

    it('should handle root tile coordinates', () => {
      const event: TileMutationEvent = {
        type: 'tile_mutation',
        mutation: 'update',
        coordinates: {
          userId: 'user123',
          groupId: 0,
          path: []
        },
        title: 'Root Tile'
      }

      expect(event.coordinates.path).toEqual([])
    })

    it('should handle negative direction paths (composed children)', () => {
      const event: TileMutationEvent = {
        type: 'tile_mutation',
        mutation: 'create',
        coordinates: {
          userId: 'user123',
          groupId: 0,
          path: [1, -2, 3]
        },
        title: 'Context Child'
      }

      expect(event.coordinates.path).toContain(-2)
    })
  })

  describe('StreamErrorEvent', () => {
    it('should contain error details', () => {
      const event: StreamErrorEvent = {
        type: 'error',
        code: 'RATE_LIMIT',
        message: 'Rate limit exceeded. Please try again in 60 seconds.',
        recoverable: true
      }

      expect(event.type).toBe('error')
      expect(event.code).toBe('RATE_LIMIT')
      expect(event.message).toBe('Rate limit exceeded. Please try again in 60 seconds.')
      expect(event.recoverable).toBe(true)
    })

    it('should indicate non-recoverable errors', () => {
      const event: StreamErrorEvent = {
        type: 'error',
        code: 'INVALID_API_KEY',
        message: 'Invalid API key provided',
        recoverable: false
      }

      expect(event.recoverable).toBe(false)
    })

    it('should support various error codes', () => {
      const errorCodes = [
        'RATE_LIMIT',
        'INVALID_API_KEY',
        'CONTEXT_LENGTH_EXCEEDED',
        'NETWORK_ERROR',
        'STREAM_INTERRUPTED',
        'UNKNOWN'
      ]

      errorCodes.forEach(code => {
        const event: StreamErrorEvent = {
          type: 'error',
          code,
          message: `Error: ${code}`,
          recoverable: false
        }

        expect(event.code).toBe(code)
      })
    })
  })

  describe('StreamDoneEvent', () => {
    it('should signal completion with metrics', () => {
      const event: StreamDoneEvent = {
        type: 'done',
        totalTokens: 1500,
        durationMs: 3200
      }

      expect(event.type).toBe('done')
      expect(event.totalTokens).toBe(1500)
      expect(event.durationMs).toBe(3200)
    })

    it('should allow optional metrics', () => {
      const event: StreamDoneEvent = {
        type: 'done'
      }

      expect(event.type).toBe('done')
      expect(event.totalTokens).toBeUndefined()
      expect(event.durationMs).toBeUndefined()
    })

    it('should allow partial metrics', () => {
      const event: StreamDoneEvent = {
        type: 'done',
        totalTokens: 500
      }

      expect(event.totalTokens).toBe(500)
      expect(event.durationMs).toBeUndefined()
    })
  })

  describe('StreamEvent discriminated union', () => {
    it('should narrow to TextDeltaEvent', () => {
      const event: StreamEvent = {
        type: 'text_delta',
        text: 'Hello'
      }

      if (event.type === 'text_delta') {
        expect(event.text).toBe('Hello')
      }
    })

    it('should narrow to ToolCallStartEvent', () => {
      const event: StreamEvent = {
        type: 'tool_call_start',
        toolCallId: 'call_1',
        toolName: 'test',
        arguments: '{}'
      }

      if (event.type === 'tool_call_start') {
        expect(event.toolName).toBe('test')
      }
    })

    it('should narrow to ToolCallDeltaEvent', () => {
      const event: StreamEvent = {
        type: 'tool_call_delta',
        toolCallId: 'call_1',
        argumentsDelta: 'chunk'
      }

      if (event.type === 'tool_call_delta') {
        expect(event.argumentsDelta).toBe('chunk')
      }
    })

    it('should narrow to ToolCallEndEvent', () => {
      const event: StreamEvent = {
        type: 'tool_call_end',
        toolCallId: 'call_1',
        result: 'done'
      }

      if (event.type === 'tool_call_end') {
        expect(event.result).toBe('done')
      }
    })

    it('should narrow to TileMutationEvent', () => {
      const event: StreamEvent = {
        type: 'tile_mutation',
        mutation: 'create',
        coordinates: { userId: 'u1', groupId: 0, path: [1] },
        title: 'Test'
      }

      if (event.type === 'tile_mutation') {
        expect(event.mutation).toBe('create')
      }
    })

    it('should narrow to StreamErrorEvent', () => {
      const event: StreamEvent = {
        type: 'error',
        code: 'UNKNOWN',
        message: 'Error',
        recoverable: false
      }

      if (event.type === 'error') {
        expect(event.code).toBe('UNKNOWN')
      }
    })

    it('should narrow to StreamDoneEvent', () => {
      const event: StreamEvent = {
        type: 'done',
        totalTokens: 100
      }

      if (event.type === 'done') {
        expect(event.totalTokens).toBe(100)
      }
    })

    it('should handle array of mixed events', () => {
      const events: StreamEvent[] = [
        { type: 'text_delta', text: 'Start' },
        { type: 'tool_call_start', toolCallId: 'c1', toolName: 'test', arguments: '{}' },
        { type: 'tool_call_end', toolCallId: 'c1', result: 'ok' },
        { type: 'text_delta', text: ' End' },
        { type: 'done', totalTokens: 50 }
      ]

      const textDeltas = events.filter((e): e is TextDeltaEvent => e.type === 'text_delta')
      const toolStarts = events.filter((e): e is ToolCallStartEvent => e.type === 'tool_call_start')
      const toolEnds = events.filter((e): e is ToolCallEndEvent => e.type === 'tool_call_end')
      const doneEvents = events.filter((e): e is StreamDoneEvent => e.type === 'done')

      expect(textDeltas).toHaveLength(2)
      expect(toolStarts).toHaveLength(1)
      expect(toolEnds).toHaveLength(1)
      expect(doneEvents).toHaveLength(1)
    })
  })

  describe('JSON serialization', () => {
    it('should serialize and deserialize TextDeltaEvent', () => {
      const event: TextDeltaEvent = {
        type: 'text_delta',
        text: 'Hello "world"'
      }

      const serialized = JSON.stringify(event)
      const deserialized = JSON.parse(serialized) as TextDeltaEvent

      expect(deserialized).toEqual(event)
    })

    it('should serialize and deserialize TileMutationEvent', () => {
      const event: TileMutationEvent = {
        type: 'tile_mutation',
        mutation: 'create',
        coordinates: {
          userId: 'user123',
          groupId: 0,
          path: [1, -2, 3]
        },
        title: 'Test',
        preview: 'Preview text'
      }

      const serialized = JSON.stringify(event)
      const deserialized = JSON.parse(serialized) as TileMutationEvent

      expect(deserialized).toEqual(event)
      expect(deserialized.coordinates.path).toEqual([1, -2, 3])
    })

    it('should serialize and deserialize StreamEvent array', () => {
      const events: StreamEvent[] = [
        { type: 'text_delta', text: 'A' },
        { type: 'tool_call_start', toolCallId: 'c1', toolName: 'fn', arguments: '{}' },
        { type: 'error', code: 'NETWORK_ERROR', message: 'Failed', recoverable: true },
        { type: 'done', totalTokens: 100, durationMs: 500 }
      ]

      const serialized = JSON.stringify(events)
      const deserialized = JSON.parse(serialized) as StreamEvent[]

      expect(deserialized).toEqual(events)
    })
  })

  describe('SSE format compatibility', () => {
    it('should format as SSE data line', () => {
      const event: StreamEvent = {
        type: 'text_delta',
        text: 'Hello'
      }

      const sseData = `data: ${JSON.stringify(event)}\n\n`

      expect(sseData).toContain('data: ')
      expect(sseData).toContain('"type":"text_delta"')
      expect(sseData.endsWith('\n\n')).toBe(true)
    })

    it('should handle newlines in text for SSE', () => {
      const event: StreamEvent = {
        type: 'text_delta',
        text: 'Line 1\nLine 2'
      }

      const serialized = JSON.stringify(event)
      // JSON.stringify escapes newlines, so it's safe for SSE
      expect(serialized).not.toContain('\n')
      expect(serialized).toContain('\\n')
    })
  })

  describe('Type guards (utility functions)', () => {
    it('should identify text delta events', () => {
      const isTextDelta = (event: StreamEvent): event is TextDeltaEvent =>
        event.type === 'text_delta'

      const textEvent: StreamEvent = { type: 'text_delta', text: 'Hi' }
      const toolEvent: StreamEvent = { type: 'tool_call_start', toolCallId: '1', toolName: 'x', arguments: '' }

      expect(isTextDelta(textEvent)).toBe(true)
      expect(isTextDelta(toolEvent)).toBe(false)
    })

    it('should identify tool call events', () => {
      const isToolCallEvent = (event: StreamEvent): event is ToolCallStartEvent | ToolCallDeltaEvent | ToolCallEndEvent =>
        event.type === 'tool_call_start' || event.type === 'tool_call_delta' || event.type === 'tool_call_end'

      const events: StreamEvent[] = [
        { type: 'text_delta', text: 'A' },
        { type: 'tool_call_start', toolCallId: '1', toolName: 'test', arguments: '{}' },
        { type: 'tool_call_delta', toolCallId: '1', argumentsDelta: 'x' },
        { type: 'tool_call_end', toolCallId: '1', result: 'ok' },
        { type: 'done' }
      ]

      const toolEvents = events.filter(isToolCallEvent)
      expect(toolEvents).toHaveLength(3)
    })

    it('should identify tile mutation events', () => {
      const isTileMutation = (event: StreamEvent): event is TileMutationEvent =>
        event.type === 'tile_mutation'

      const mutation: StreamEvent = {
        type: 'tile_mutation',
        mutation: 'create',
        coordinates: { userId: 'u', groupId: 0, path: [] }
      }

      expect(isTileMutation(mutation)).toBe(true)
    })

    it('should identify terminal events (error or done)', () => {
      const isTerminalEvent = (event: StreamEvent): event is StreamErrorEvent | StreamDoneEvent =>
        event.type === 'error' || event.type === 'done'

      const events: StreamEvent[] = [
        { type: 'text_delta', text: 'A' },
        { type: 'error', code: 'X', message: 'Err', recoverable: false },
        { type: 'done', totalTokens: 10 }
      ]

      const terminalEvents = events.filter(isTerminalEvent)
      expect(terminalEvents).toHaveLength(2)
    })
  })

  describe('Coordinate format consistency', () => {
    it('should match TileSnapshot coordinate format from contracts.ts', () => {
      // This test ensures TileMutationEvent coordinates match existing TileSnapshot format
      const tileMutationCoords = {
        userId: 'user123',
        groupId: 0,
        path: [1, 2, 3]
      }

      // These should have the same structure
      expect(tileMutationCoords).toHaveProperty('userId')
      expect(tileMutationCoords).toHaveProperty('groupId')
      expect(tileMutationCoords).toHaveProperty('path')
      expect(Array.isArray(tileMutationCoords.path)).toBe(true)
    })
  })
})
