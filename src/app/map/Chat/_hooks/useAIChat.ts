import { useState, useCallback, useContext, useMemo } from 'react'
import { api } from '~/commons/trpc/react'
import { useChatState, type ChatMessage, type Message } from '~/app/map/Chat'
import { MapCacheContext } from '~/app/map/Cache'
import type { CompositionConfig } from '~/lib/domains/agentic'
import { loggers } from '~/lib/debug/debug-logger'

// Type for the tRPC response that might include jobId for queued responses
interface GenerateResponseResult {
  id: string
  content: string
  model: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  finishReason?: 'stop' | 'length' | 'content_filter' | 'error' | 'queued'
  jobId?: string // Present when finishReason is 'queued'
}

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
  // Extract cache data directly from context if available
  const cache = useMemo(() => {
    return context?.state ? {
      items: context.state.itemsById,
      center: context.state.currentCenter
    } : null
  }, [context])
  
  
  const generateResponseMutation = api.agentic.generateResponse.useMutation({
    onSuccess: (response: GenerateResponseResult) => _handleSuccessResponse(response, chatState, setIsGenerating),
    onError: (error) => _handleErrorResponse(error, chatState, setIsGenerating)
  })

  const sendToAI = useCallback(async (message: string) => {
    if (!cache) {
      chatState.showSystemMessage(
        'Cache not available. Please ensure you are using the chat within a map context.',
        'error'
      )
      return
    }
    
    const centerCoordId = cache.center
    
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
    generateResponseMutation.mutate({
      centerCoordId,
      messages,
      model: 'deepseek/deepseek-r1-0528',
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      compositionConfig: options.compositionConfig,
      cacheState: _transformCacheState(cache)
    })
  }, [chatState, cache, generateResponseMutation, options])

  // Return no-op functions if cache is not available
  if (!cache) {
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

// Helper functions extracted from useAIChat
function _handleSuccessResponse(
  response: GenerateResponseResult, 
  chatState: any, 
  setIsGenerating: (value: boolean) => void
) {
  // Check if response is queued based on finishReason
  if (response.finishReason === 'queued' && response.jobId) {
    // Send AI Response widget for queued job
    chatState.showAIResponseWidget({
      jobId: response.jobId,
      model: response.model
    })
    loggers.agentic('Request queued, widget sent', { jobId: response.jobId })
  } else {
    // Send AI Response widget for direct response
    chatState.showAIResponseWidget({
      initialResponse: response.content,
      model: response.model
    })
    loggers.agentic('Direct AI response, widget sent', {
      model: response.model,
      usage: response.usage,
      finishReason: response.finishReason
    })
  }
  setIsGenerating(false)
}

function _handleErrorResponse(
  error: any, 
  chatState: any, 
  setIsGenerating: (value: boolean) => void
) {
  console.error('[useAIChat] Mutation error:', error)
  chatState.showSystemMessage(`AI Error: ${error.message}`, 'error')
  loggers.agentic.error('AI generation failed', { error: error.message })
  setIsGenerating(false)
}

function _prepareMessagesForAI(messages: Message[], newMessage: string): ChatMessage[] {
  // Get current chat messages for context
  const chatMessages: ChatMessage[] = messages.map((msg: Message) => ({
    id: msg.id,
    type: msg.actor as 'user' | 'assistant' | 'system',
    content: msg.content,
    metadata: {
      timestamp: msg.timestamp
    }
  }))

  // Add the new user message
  chatMessages.push({
    id: `msg-${Date.now()}`,
    type: 'user',
    content: newMessage,
    metadata: {
      timestamp: new Date()
    }
  })

  return chatMessages
}

function _transformCacheState(cache: any) {
  return {
    itemsById: Object.fromEntries(
      Object.entries(cache.items).map(([id, item]: [string, any]) => [
        id,
        {
          metadata: {
            coordId: item.metadata.coordId,
            coordinates: item.metadata.coordinates,
            parentId: item.metadata.parentId ?? undefined,
            depth: item.metadata.depth
          },
          data: {
            name: item.data.name ?? '',
            description: item.data.description ?? '',
            url: item.data.url ?? '',
            color: item.data.color ?? ''
          }
        }
      ])
    ),
    currentCenter: cache.center ?? ''
  }
}