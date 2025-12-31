/**
 * useStreamingExecution Hook - SSE Streaming Client
 *
 * Manages EventSource connection to the streaming endpoint and dispatches
 * typed events to callback handlers for real-time UI updates.
 *
 * @module useStreamingExecution
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  type StreamingCallbacks,
  type ConnectionRefs,
  type StateSetters,
  _buildStreamingUrl,
  _createMessageHandler,
  _createErrorHandler
} from '~/app/map/Chat/_hooks/_streaming-utils'

export type { StreamingCallbacks }

/** Options for useStreamingExecution hook */
export interface UseStreamingExecutionOptions {
  /** Task coordinates in format "userId,groupId:path" */
  taskCoords: string
  /** Optional instruction to include in execution */
  instruction?: string
  /** Callback handlers for streaming events */
  callbacks: StreamingCallbacks
  /** Whether to start streaming automatically (default: false) */
  autoStart?: boolean
}

/** Return value from useStreamingExecution hook */
export interface UseStreamingExecutionReturn {
  /** Whether streaming is currently active */
  isStreaming: boolean
  /** Error message if an error occurred */
  error: string | null
  /** Start the streaming connection */
  start: () => void
  /** Abort the streaming connection */
  abort: () => void
}

/**
 * Hook for managing SSE streaming execution
 */
export function useStreamingExecution(
  options: UseStreamingExecutionOptions
): UseStreamingExecutionReturn {
  const { taskCoords, instruction, callbacks, autoStart = false } = options

  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const isMountedRef = useRef(true)
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  const refs: ConnectionRefs = {
    eventSource: eventSourceRef,
    isMounted: isMountedRef,
    callbacks: callbacksRef
  }

  const stateSetters: StateSetters = { setError, setIsStreaming }

  // useMemo with intentionally empty deps - refs/stateSetters use refs for stable identity
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleMessage = useMemo(() => _createMessageHandler(refs, stateSetters), [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleError = useMemo(() => _createErrorHandler(refs, stateSetters), [])
  const handleOpen = useCallback(() => {
    if (isMountedRef.current) setIsStreaming(true)
  }, [])

  const start = useCallback(() => {
    if (eventSourceRef.current) return
    setError(null)
    const eventSource = new EventSource(_buildStreamingUrl(taskCoords, instruction))
    eventSource.onmessage = handleMessage
    eventSource.onerror = handleError
    eventSource.onopen = handleOpen
    eventSourceRef.current = eventSource
  }, [taskCoords, instruction, handleMessage, handleError, handleOpen])

  const abort = useCallback(() => {
    eventSourceRef.current?.close()
    eventSourceRef.current = null
    setIsStreaming(false)
  }, [])

  useEffect(() => {
    if (autoStart) start()
  }, [autoStart, start])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      eventSourceRef.current?.close()
    }
  }, [])

  return { isStreaming, error, start, abort }
}
