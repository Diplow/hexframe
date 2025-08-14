import { useState, useCallback, useContext, useMemo } from 'react'
import { api } from '~/commons/trpc/react'
import { useChatState } from '../_state'
import { MapCacheContext } from '../../Cache/interface'
import type { ChatMessage } from '../types'
import type { CompositionConfig } from '~/lib/domains/agentic/types'
import type { QueuedJobResponse } from '~/lib/domains/agentic/types/job.types'
import type { Message } from '../_state/_events/event.types'
import { loggers } from '~/lib/debug/debug-logger'

interface UseAIChatOptions {
  temperature?: number
  maxTokens?: number
  compositionConfig?: CompositionConfig
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const chatState = useChatState()
  const [isGenerating, setIsGenerating] = useState(false)
  
  console.log('[useAIChat] Hook initialized with options:', options)
  
  // Check if cache context is available (handles SSR/hydration)
  const context = useContext(MapCacheContext)
  // Extract cache data directly from context if available
  const cache = useMemo(() => {
    return context?.state ? {
      items: context.state.itemsById,
      center: context.state.currentCenter
    } : null
  }, [context])
  
  console.log('[useAIChat] Cache available:', !!cache)
  
  const generateResponseMutation = api.agentic.generateResponse.useMutation({
    onSuccess: (response) => {
      console.log('[useAIChat] Mutation success, response:', response)
      console.log('[useAIChat] Response details:', {
        hasJobId: 'jobId' in response,
        hasStatus: 'status' in response,
        status: 'status' in response ? response.status : undefined,
        finishReason: 'finishReason' in response ? response.finishReason : undefined,
        id: response.id,
        content: response.content
      })
      
      // Check if response is queued based on finishReason
      if ((response as QueuedJobResponse).finishReason === 'queued') {
        // Send AI Response widget for queued job
        console.log('[useAIChat] Response is QUEUED, creating widget with jobId:', response.id)
        
        chatState.showAIResponseWidget({
          jobId: response.id,
          model: response.model
        })
        
        console.log('[useAIChat] Widget creation called for queued job')
        loggers.agentic('Request queued, widget sent', { jobId: response.id })
      } else {
        // Send AI Response widget for direct response
        console.log('[useAIChat] Response is DIRECT, creating widget with content')
        
        chatState.showAIResponseWidget({
          initialResponse: response.content,
          model: response.model
        })
        
        console.log('[useAIChat] Widget creation called for direct response')
        loggers.agentic('Direct AI response, widget sent', {
          model: response.model,
          usage: response.usage,
          finishReason: response.finishReason
        })
      }
      setIsGenerating(false)
    },
    onError: (error) => {
      console.error('[useAIChat] Mutation error:', error)
      chatState.showSystemMessage(
        `AI Error: ${error.message}`,
        'error'
      )
      loggers.agentic.error('AI generation failed', { error: error.message })
      setIsGenerating(false)
    }
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

    // Get current chat messages for context
    const messages: ChatMessage[] = chatState.messages.map((msg: Message) => ({
      id: msg.id,
      type: msg.actor as 'user' | 'assistant' | 'system',
      content: msg.content,
      metadata: {
        timestamp: msg.timestamp
      }
    }))

    // Add the new user message
    messages.push({
      id: `msg-${Date.now()}`,
      type: 'user',
      content: message,
      metadata: {
        timestamp: new Date()
      }
    })

    setIsGenerating(true)
    
    console.log('[useAIChat] Calling generateResponse mutation with:', {
      centerCoordId,
      messageCount: messages.length,
      model: 'deepseek/deepseek-r1-0528'
    })
    
    // Generate AI response (user message is already in chat)
    generateResponseMutation.mutate({
      centerCoordId,
      messages,
      model: 'deepseek/deepseek-r1-0528',
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      compositionConfig: options.compositionConfig,
      cacheState: {
        itemsById: Object.fromEntries(
          Object.entries(cache.items).map(([id, item]) => [
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