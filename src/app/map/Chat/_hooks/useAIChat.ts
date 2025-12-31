import { useState, useCallback, useContext, useRef } from 'react'
import { api } from '~/commons/trpc/react'
import { useChatState } from '~/app/map/Chat'
import { MapCacheContext } from '~/app/map/Cache'
import type { CompositionConfig } from '~/lib/domains/agentic'
import { type GenerateResponseResult, _handleSuccessResponse, _handleErrorResponse } from '~/app/map/Chat/_hooks/_ai-response-handlers'
import { _prepareMessagesForAI } from '~/app/map/Chat/_hooks/_ai-message-utils'
import { convertChatMessagesToContracts } from '~/app/map/_utils/contract-converters'
import { useStreamingExecution } from '~/app/map/Chat/_hooks/useStreamingExecution'
import { createStreamingChatCallbacks } from '~/app/map/Chat/_hooks/_streaming-chat-callbacks'
import { nanoid } from 'nanoid'

interface UseAIChatOptions {
  temperature?: number
  maxTokens?: number
  compositionConfig?: CompositionConfig
  /** Enable streaming mode for real-time response updates */
  streaming?: boolean
  /** Task coordinates for streaming execution (required when streaming is true) */
  taskCoords?: string
  /** Optional instruction for streaming execution */
  instruction?: string
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const chatState = useChatState()
  const [isGenerating, setIsGenerating] = useState(false)
  const streamIdRef = useRef<string | null>(null)

  // Check if cache context is available (handles SSR/hydration)
  const context = useContext(MapCacheContext)
  // Get cache state from context
  const cacheState = context?.state

  // Create streaming callbacks that connect to chat state
  const streamingCallbacks = createStreamingChatCallbacks({
    chatState,
    streamId: streamIdRef.current ?? '',
    onDone: () => {
      setIsGenerating(false)
      streamIdRef.current = null
    },
    onError: () => {
      setIsGenerating(false)
      streamIdRef.current = null
    },
  })

  // Set up streaming execution hook (only used when streaming mode is enabled)
  const streamingExecution = useStreamingExecution({
    taskCoords: options.taskCoords ?? '',
    instruction: options.instruction,
    callbacks: streamingCallbacks,
    autoStart: false,
  })
  
  
  const generateResponseMutation = api.agentic.generateResponse.useMutation({
    onSuccess: (response: GenerateResponseResult) => {
      _handleSuccessResponse(response, chatState, setIsGenerating);
    },
    onError: (error) => {
      _handleErrorResponse(error, chatState, setIsGenerating);
    }
  })

  const sendToAI = useCallback(async (message: string) => {
    if (!cacheState) {
      chatState.showSystemMessage(
        'Cache not available. Please ensure you are using the chat within a map context.',
        'error'
      )
      return
    }

    const centerCoordId = cacheState.currentCenter

    if (!centerCoordId) {
      chatState.showSystemMessage(
        'No tile selected. Please select a tile to provide context for the AI.',
        'warning'
      )
      return
    }

    setIsGenerating(true)

    // Use streaming mode if enabled and task coords are provided
    if (options.streaming && options.taskCoords) {
      // Generate a unique stream ID for this streaming session
      streamIdRef.current = `stream-${nanoid()}`

      // Start the streaming message
      chatState.startStreamingMessage(streamIdRef.current)

      // Start SSE streaming execution
      streamingExecution.start()
      return
    }

    // Non-streaming mode: use mutation
    const messages = _prepareMessagesForAI(chatState.messages, message)

    // Generate AI response (user message is already in chat)
    // Note: When using Claude Agent SDK, must use Claude models (not OpenRouter models)
    generateResponseMutation.mutate({
      centerCoordId,
      messages: convertChatMessagesToContracts(messages),
      model: 'claude-haiku-4-5-20251001', // Changed from deepseek to Claude model for SDK compatibility
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      compositionConfig: options.compositionConfig
    })
  }, [chatState, cacheState, generateResponseMutation, options, streamingExecution])

  // Abort streaming if needed
  const abortStreaming = useCallback(() => {
    streamingExecution.abort()
    setIsGenerating(false)
    streamIdRef.current = null
  }, [streamingExecution])

  // Return no-op functions if cache is not available
  if (!cacheState) {
    return {
      sendToAI: async () => {
        console.warn('[useAIChat] Cannot send to AI - cache context not available')
      },
      isGenerating: false,
      isStreaming: false,
      isError: false,
      error: null,
      abortStreaming: () => { /* no-op when cache unavailable */ },
    }
  }

  return {
    sendToAI,
    isGenerating,
    isStreaming: streamingExecution.isStreaming,
    isError: generateResponseMutation.isError ?? !!streamingExecution.error,
    error: generateResponseMutation.error ?? streamingExecution.error,
    abortStreaming,
  }
}