/**
 * Hook for streaming task execution via SSE
 * Handles dynamic taskCoords by creating new connections per execution
 * @module useStreamingTaskExecution
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { nanoid } from 'nanoid'
import type { useChatOperations } from '~/app/map/Chat/_state'
import { createStreamingChatCallbacks, type HexframeMutationInfo } from '~/app/map/Chat/_hooks/_streaming-chat-callbacks'
import {
  _buildStreamingUrl,
  _parseStreamEvent,
  _dispatchStreamEvent,
} from '~/app/map/Chat/_hooks/_streaming-utils'
import type { EventBusService } from '~/app/map/types'

interface UseStreamingTaskExecutionOptions {
  chatState: ReturnType<typeof useChatOperations>
  eventBus?: EventBusService
}

interface UseStreamingTaskExecutionReturn {
  executeTask: (taskCoords: string, instruction: string, discussion?: string) => void
  isStreaming: boolean
  abort: () => void
}

/**
 * Convert hexframe mutation coordinates to coordId string for EventBus
 */
function _extractCoordId(args: Record<string, unknown>): string | null {
  const coords = args.coords as { userId?: string; groupId?: number; path?: number[] } | undefined
  if (!coords?.userId || coords.groupId === undefined || !coords.path) {
    return null
  }
  // Format: "userId,groupId:path"
  const pathStr = coords.path.length > 0 ? coords.path.join(',') : ''
  return `${coords.userId},${coords.groupId}:${pathStr}`
}

/**
 * Map mutation type to EventBus event type
 */
const MUTATION_EVENT_MAP: Record<HexframeMutationInfo['type'], 'map.tile_created' | 'map.tile_updated' | 'map.tile_deleted'> = {
  'create': 'map.tile_created',
  'update': 'map.tile_updated',
  'delete': 'map.tile_deleted',
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
  const { chatState, eventBus } = options
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

  const executeTask = useCallback((taskCoords: string, instruction: string, discussion?: string) => {
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
      // Emit EventBus events for hexframe mutations to trigger cache invalidation
      onHexframeMutation: eventBus ? (mutation) => {
        const coordId = _extractCoordId(mutation.arguments)
        if (!coordId) return

        const eventType = MUTATION_EVENT_MAP[mutation.type]
        const title = (mutation.arguments.title as string) ?? ''

        eventBus.emit({
          type: eventType,
          source: 'agentic',
          payload: {
            tileId: coordId,
            tileName: title,
            coordId,
          }
        })
      } : undefined,
    })

    // Store callbacks in ref for message handler
    const callbacksRef = { current: callbacks }

    // Build URL and create EventSource
    const url = _buildStreamingUrl({ taskCoords, instruction, discussion })
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
  }, [chatState, abort, eventBus])

  return { executeTask, isStreaming, abort }
}
