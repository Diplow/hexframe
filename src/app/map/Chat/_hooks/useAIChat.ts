import { useState, useCallback } from 'react'
import { api } from '~/commons/trpc/react'
import { useChatState } from '../_state'
import { useMapCacheContextSafe } from '../../Cache/_hooks/use-cache-context'
import type { ChatMessage } from '../types'
import type { CompositionConfig } from '~/lib/domains/agentic/types'
import { loggers } from '~/lib/debug/debug-logger'

interface UseAIChatOptions {
  temperature?: number
  maxTokens?: number
  compositionConfig?: CompositionConfig
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const chatState = useChatState()
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Use safe version that returns null instead of throwing
  const context = useMapCacheContextSafe()
  const cacheState = context?.state ?? null
  
  const generateResponseMutation = api.agentic.generateResponse.useMutation({
    onSuccess: (response) => {
      // Add the AI response to chat
      chatState.sendAssistantMessage(response.content)
      
      // Log usage for debugging
      loggers.agentic('AI response received', {
        model: response.model,
        usage: response.usage,
        finishReason: response.finishReason
      })
    },
    onError: (error) => {
      chatState.showSystemMessage(
        `AI Error: ${error.message}`,
        'error'
      )
      loggers.agentic.error('AI generation failed', { error: error.message })
    },
    onSettled: () => {
      setIsGenerating(false)
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

    // Get current chat messages for context
    const messages: ChatMessage[] = chatState.messages.map(msg => ({
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
          Object.entries(cacheState.itemsById).map(([id, item]) => [
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
        currentCenter: cacheState.currentCenter ?? ''
      }
    })
  }, [chatState, cacheState, generateResponseMutation, options])

  return {
    sendToAI,
    isGenerating,
    isError: generateResponseMutation.isError,
    error: generateResponseMutation.error
  }
}