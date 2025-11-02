import { useState, useCallback, useContext } from 'react'
import { api } from '~/commons/trpc/react'
import { useChatState } from '~/app/map/Chat'
import { MapCacheContext } from '~/app/map/Cache'
import type { CompositionConfig } from '~/lib/domains/agentic'
import { type GenerateResponseResult, _handleSuccessResponse, _handleErrorResponse } from '~/app/map/Chat/_hooks/_ai-response-handlers'
import { _prepareMessagesForAI } from '~/app/map/Chat/_hooks/_ai-message-utils'
import { convertChatMessagesToContracts, convertCacheStateToAISnapshot } from '~/app/map/_utils/contract-converters'

interface UseAIChatOptions {
  temperature?: number
  maxTokens?: number
  compositionConfig?: CompositionConfig
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const chatState = useChatState()
  const [isGenerating, setIsGenerating] = useState(false)
  
  
  // Check if cache context is available (handles SSR/hydration)
  const context = useContext(MapCacheContext)
  // Get cache state from context
  const cacheState = context?.state
  
  
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

    const messages = _prepareMessagesForAI(chatState.messages, message)

    setIsGenerating(true)

    // Generate AI response (user message is already in chat)
    // Note: When using Claude Agent SDK, must use Claude models (not OpenRouter models)
    generateResponseMutation.mutate({
      centerCoordId,
      messages: convertChatMessagesToContracts(messages),
      model: 'claude-haiku-4-5-20251001', // Changed from deepseek to Claude model for SDK compatibility
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      compositionConfig: options.compositionConfig,
      contextSnapshot: convertCacheStateToAISnapshot(cacheState)
    })
  }, [chatState, cacheState, generateResponseMutation, options])

  // Return no-op functions if cache is not available
  if (!cacheState) {
    return {
      sendToAI: async () => {
        console.warn('[useAIChat] Cannot send to AI - cache context not available')
      },
      isGenerating: false,
      isError: false,
      error: null
    }
  }

  return {
    sendToAI,
    isGenerating,
    isError: generateResponseMutation.isError,
    error: generateResponseMutation.error
  }
}