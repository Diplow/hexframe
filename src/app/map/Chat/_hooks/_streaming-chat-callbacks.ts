/**
 * Streaming callbacks for chat integration
 * Bridges the streaming execution hook with chat state operations
 * @module _streaming-chat-callbacks
 */

import type { MutableRefObject } from 'react'
import type { StreamingCallbacks } from '~/app/map/Chat/_hooks/_streaming-utils'
import type { useChatOperations } from '~/app/map/Chat/_state'

/** Hexframe mutation tool info extracted from tool calls */
export interface HexframeMutationInfo {
  type: 'create' | 'update' | 'delete'
  toolName: string
  arguments: Record<string, unknown>
}

interface StreamingChatCallbacksOptions {
  chatState: ReturnType<typeof useChatOperations>
  /** Ref to the stream ID - derefenced lazily to avoid stale closures */
  streamIdRef: MutableRefObject<string | null>
  onDone?: () => void
  onError?: (error: string) => void
  /** Called when a hexframe mutation tool completes (addItem, updateItem, deleteItem) */
  onHexframeMutation?: (mutation: HexframeMutationInfo) => void
}

/**
 * Create streaming callbacks that dispatch events to the chat state
 *
 * These callbacks connect the SSE streaming events to the chat UI:
 * - Text deltas append to the current streaming message
 * - Tool call events create/update tool call widgets
 * - Done event finalizes the message
 * - Error events show error messages
 */
// Hexframe MCP tools that cause mutations
const HEXFRAME_MUTATION_TOOLS: Record<string, 'create' | 'update' | 'delete'> = {
  'mcp__hexframe__addItem': 'create',
  'mcp__debughexframe__addItem': 'create',
  'mcp__hexframe__updateItem': 'update',
  'mcp__debughexframe__updateItem': 'update',
  'mcp__hexframe__deleteItem': 'delete',
  'mcp__debughexframe__deleteItem': 'delete',
}

export function createStreamingChatCallbacks(
  options: StreamingChatCallbacksOptions
): StreamingCallbacks {
  const { chatState, streamIdRef, onDone, onError, onHexframeMutation } = options

  // Track accumulated content for finalization
  let accumulatedContent = ''

  // Helper to get current stream ID with safe default
  const getStreamId = (): string => streamIdRef.current ?? ''

  return {
    onPromptGenerated: (prompt: string) => {
      chatState.setMessagePrompt(getStreamId(), prompt)
    },

    onTextDelta: (delta: string) => {
      accumulatedContent += delta
      chatState.appendToStreamingMessage(getStreamId(), delta)
    },

    onToolCallStart: (toolName: string, toolCallId: string, argsString: string) => {
      // Parse arguments from JSON string (may be empty at start, full args come with tool_call_end)
      let parsedArguments: Record<string, unknown> = {}
      try {
        parsedArguments = JSON.parse(argsString) as Record<string, unknown>
      } catch {
        // Keep empty object if parsing fails - full args will come with tool_call_end
      }

      const currentStreamId = getStreamId()

      // Start tool call in message operations
      chatState.startToolCall(currentStreamId, toolCallId, toolName, parsedArguments)

      // Show tool call widget
      chatState.showToolCallWidget({
        toolCallId,
        streamId: currentStreamId,
        toolName,
        arguments: parsedArguments,
      })
    },

    onToolCallEnd: (toolCallId: string, toolName?: string, argsString?: string, result?: string, error?: string) => {
      const success = !error
      const resultContent = result ?? error ?? ''

      // End tool call in message operations
      chatState.endToolCall(getStreamId(), toolCallId, resultContent, success)

      // Update tool call widget
      chatState.updateToolCallWidget(toolCallId, resultContent, success)

      // Check if this was a hexframe mutation tool and notify for cache invalidation
      const mutationType = toolName ? HEXFRAME_MUTATION_TOOLS[toolName] : undefined

      if (mutationType && toolName && success && onHexframeMutation) {
        // Parse the arguments from the end event
        let parsedArguments: Record<string, unknown> = {}
        if (argsString) {
          try {
            parsedArguments = JSON.parse(argsString) as Record<string, unknown>
          } catch {
            // Keep empty object if parsing fails
          }
        }

        const mutation: HexframeMutationInfo = {
          type: mutationType,
          toolName,
          arguments: parsedArguments
        }
        onHexframeMutation(mutation)
      }
    },

    onDone: (_event) => {
      // Finalize the streaming message with accumulated content
      // Note: StreamDoneEvent only has totalTokens (input+output combined),
      // not separate counts, so we omit token usage rather than report incorrect values
      chatState.finalizeStreamingMessage(getStreamId(), accumulatedContent)

      onDone?.()
    },

    onError: (event) => {
      // Show error in chat
      chatState.showSystemMessage(`Streaming error: ${event.message}`, 'error')

      // If not recoverable, finalize with what we have
      if (!event.recoverable && accumulatedContent) {
        chatState.finalizeStreamingMessage(getStreamId(), accumulatedContent)
      }

      onError?.(event.message)
    },

    onToolCallDelta: (_toolCallId: string, _delta: string) => {
      // Tool call deltas are for argument streaming, which we don't visualize yet
      // Could be used to show progressive argument building in the widget
    },

    onTileMutation: (_event) => {
      // Tile mutations are handled by the map cache context
      // This callback is available for future use
    },
  }
}
