/**
 * Hook for streaming task execution via SSE
 * Handles dynamic taskCoords by creating new connections per execution
 * @module useStreamingTaskExecution
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { nanoid } from 'nanoid'
import type { useChatOperations } from '~/app/map/Chat/_state'
import { createStreamingChatCallbacks } from '~/app/map/Chat/_hooks/_streaming-chat-callbacks'
import {
  _buildStreamingUrl,
  _parseStreamEvent,
  _dispatchStreamEvent,
} from '~/app/map/Chat/_hooks/_streaming-utils'

interface UseStreamingTaskExecutionOptions {
  chatState: ReturnType<typeof useChatOperations>
}

interface UseStreamingTaskExecutionReturn {
  executeTask: (taskCoords: string, instruction: string) => void
  isStreaming: boolean
  abort: () => void
}

/**
 * Hook for streaming task execution that handles dynamic taskCoords
 *
 * Unlike useStreamingExecution which requires taskCoords upfront,
 * this hook creates a new SSE connection for each task execution.
 */
export function useStreamingTaskExecution(
  options: UseStreamingTaskExecutionOptions
): UseStreamingTaskExecutionReturn {
  const { chatState } = options
  const eventSourceRef = useRef<EventSource | null>(null)
  const isMountedRef = useRef(true)
  const [isStreaming, setIsStreaming] = useState(false)

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      eventSourceRef.current?.close()
    }
  }, [])

  const abort = useCallback(() => {
    eventSourceRef.current?.close()
    eventSourceRef.current = null
    if (isMountedRef.current) setIsStreaming(false)
  }, [])

  const executeTask = useCallback((taskCoords: string, instruction: string) => {
    // Abort any existing connection
    abort()

    // Generate stream ID and start streaming message
    const streamId = `stream-${nanoid()}`
    chatState.startStreamingMessage(streamId)

    // Create a ref-like object to hold the stream ID for callbacks
    const streamIdRef: { current: string | null } = { current: streamId }

    // Create callbacks for this execution
    const callbacks = createStreamingChatCallbacks({
      chatState,
      streamIdRef,
      onDone: () => {
        if (isMountedRef.current) setIsStreaming(false)
        eventSourceRef.current = null
        streamIdRef.current = null
      },
      onError: () => {
        if (isMountedRef.current) setIsStreaming(false)
        eventSourceRef.current = null
        streamIdRef.current = null
      },
    })

    // Store callbacks in ref for message handler
    const callbacksRef = { current: callbacks }

    // Build URL and create EventSource
    const url = _buildStreamingUrl(taskCoords, instruction)
    const eventSource = new EventSource(url)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      if (isMountedRef.current) setIsStreaming(true)
    }

    eventSource.onmessage = (messageEvent: MessageEvent) => {
      if (!isMountedRef.current) return
      const event = _parseStreamEvent(messageEvent.data as string)
      if (!event) return

      const result = _dispatchStreamEvent(event, callbacksRef.current)
      if (result.shouldClose) {
        eventSource.close()
        eventSourceRef.current = null
        if (isMountedRef.current) setIsStreaming(false)
      }
    }

    eventSource.onerror = () => {
      if (!isMountedRef.current) return
      chatState.showSystemMessage('Connection error during task execution', 'error')
      setIsStreaming(false)
      eventSource.close()
      eventSourceRef.current = null
    }
  }, [chatState, abort])

  return { executeTask, isStreaming, abort }
}
