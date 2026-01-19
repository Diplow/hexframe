/**
 * Helper functions for extracting data from Claude SDK stream events.
 */

import type { ToolCallStartEvent } from '~/lib/domains/agentic/types/stream.types'

// Return type for extractToolCallStart including content block index for correlation
export interface ToolCallStartExtraction {
  event: ToolCallStartEvent
  contentBlockIndex: number
}

// Track active tool calls to correlate start/end
export interface ActiveToolCall {
  toolCallId: string
  toolName: string
  inputJson: string
  contentBlockIndex: number
}

// Return type for input_json_delta extraction
export interface InputJsonDeltaExtraction {
  contentBlockIndex: number
  partialJson: string
}

/**
 * Safely extract delta text from SDK stream events.
 */
export function extractDeltaText(event: unknown): string | undefined {
  if (
    event &&
    typeof event === 'object' &&
    'type' in event &&
    event.type === 'content_block_delta' &&
    'delta' in event &&
    event.delta &&
    typeof event.delta === 'object' &&
    'text' in event.delta &&
    typeof event.delta.text === 'string'
  ) {
    return event.delta.text
  }
  return undefined
}

/**
 * Extract tool_use content block start events.
 */
export function extractToolCallStart(event: unknown): ToolCallStartExtraction | undefined {
  if (
    event &&
    typeof event === 'object' &&
    'type' in event &&
    event.type === 'content_block_start' &&
    'index' in event &&
    typeof event.index === 'number' &&
    'content_block' in event &&
    event.content_block &&
    typeof event.content_block === 'object' &&
    'type' in event.content_block &&
    event.content_block.type === 'tool_use'
  ) {
    const block = event.content_block as { id?: string; name?: string; input?: unknown }
    return {
      event: {
        type: 'tool_call_start',
        toolCallId: block.id ?? '',
        toolName: block.name ?? '',
        arguments: JSON.stringify(block.input ?? {})
      },
      contentBlockIndex: event.index
    }
  }
  return undefined
}

/**
 * Extract content_block_stop events that signal tool call completion.
 */
export function extractContentBlockStop(event: unknown): number | undefined {
  if (
    event &&
    typeof event === 'object' &&
    'type' in event &&
    event.type === 'content_block_stop' &&
    'index' in event &&
    typeof event.index === 'number'
  ) {
    return event.index
  }
  return undefined
}

/**
 * Extract input_json_delta from content_block_delta events.
 */
export function extractInputJsonDelta(event: unknown): InputJsonDeltaExtraction | undefined {
  if (
    event &&
    typeof event === 'object' &&
    'type' in event &&
    event.type === 'content_block_delta' &&
    'index' in event &&
    typeof event.index === 'number' &&
    'delta' in event &&
    event.delta &&
    typeof event.delta === 'object' &&
    'type' in event.delta &&
    event.delta.type === 'input_json_delta' &&
    'partial_json' in event.delta &&
    typeof event.delta.partial_json === 'string'
  ) {
    return {
      contentBlockIndex: event.index,
      partialJson: event.delta.partial_json
    }
  }
  return undefined
}
