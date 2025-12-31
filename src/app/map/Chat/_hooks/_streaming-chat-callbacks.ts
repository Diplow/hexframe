/**
 * Streaming callbacks for chat integration
 * Bridges the streaming execution hook with chat state operations
 * @module _streaming-chat-callbacks
 */

import type { StreamingCallbacks } from '~/app/map/Chat/_hooks/_streaming-utils'
import type { useChatOperations } from '~/app/map/Chat/_state'

interface StreamingChatCallbacksOptions {
  chatState: ReturnType<typeof useChatOperations>
  streamId: string
  onDone?: () => void
  onError?: (error: string) => void
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
export function createStreamingChatCallbacks(
  options: StreamingChatCallbacksOptions
): StreamingCallbacks {
  const { chatState, streamId, onDone, onError } = options

  // Track accumulated content for finalization
  let accumulatedContent = ''

  return {
    onTextDelta: (delta: string) => {
      accumulatedContent += delta
      chatState.appendToStreamingMessage(streamId, delta)
    },

    onToolCallStart: (toolName: string, toolCallId: string, argsString: string) => {
      // Parse arguments from JSON string
      let parsedArguments: Record<string, unknown> = {}
      try {
        parsedArguments = JSON.parse(argsString) as Record<string, unknown>
      } catch {
        // Keep empty object if parsing fails
      }

      // Start tool call in message operations
      chatState.startToolCall(streamId, toolCallId, toolName, parsedArguments)

      // Show tool call widget
      chatState.showToolCallWidget({
        toolCallId,
        streamId,
        toolName,
        arguments: parsedArguments,
      })
    },

    onToolCallEnd: (toolCallId: string, result?: string, error?: string) => {
      const success = !error
      const resultContent = result ?? error ?? ''

      // End tool call in message operations
      chatState.endToolCall(streamId, toolCallId, resultContent, success)

      // Update tool call widget
      chatState.updateToolCallWidget(toolCallId, resultContent, success)
    },

    onDone: (event) => {
      // Finalize the streaming message with accumulated content
      // Note: StreamDoneEvent only has totalTokens, not separate input/output
      chatState.finalizeStreamingMessage(
        streamId,
        accumulatedContent,
        event.totalTokens ? {
          outputTokens: event.totalTokens,
        } : undefined
      )

      onDone?.()
    },

    onError: (event) => {
      // Show error in chat
      chatState.showSystemMessage(`Streaming error: ${event.message}`, 'error')

      // If not recoverable, finalize with what we have
      if (!event.recoverable && accumulatedContent) {
        chatState.finalizeStreamingMessage(streamId, accumulatedContent)
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
