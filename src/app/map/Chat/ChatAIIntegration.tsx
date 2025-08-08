'use client'

import { useEffect } from 'react'
import { useChatState } from './_state'
import { api } from '~/commons/trpc/react'
import { useMapCacheContext } from '../Cache/map-cache'
import type { ChatMessage } from './types'

/**
 * Component that handles AI integration for the chat
 * This is mounted inside the ChatPanel to enable AI responses
 */
export function ChatAIIntegration() {
  const chatState = useChatState()
  // Try to get cache context - might not be available in tests
  let cacheState: ReturnType<typeof useMapCacheContext>['state'] | null = null
  try {
    const context = useMapCacheContext()
    cacheState = context.state
  } catch {
    // Context not available (e.g., in tests)
  }
  
  // Create the mutation outside of effects
  const sendToAI = api.agentic.generateResponse.useMutation({
    onSuccess: (response) => {
      chatState.sendMessage(`[AI]: ${response.content}`)
    },
    onError: (error) => {
      chatState.showSystemMessage(
        `AI Error: ${error.message}`,
        'error'
      )
    }
  })

  useEffect(() => {
    // Find the latest user message
    const userMessages = chatState.messages.filter((msg: any) => msg.actor === 'user')
    const latestMessage = userMessages[userMessages.length - 1]
    
    if (!latestMessage) return

    const messageContent = latestMessage.content
    
    // Check if this is an AI message
    if (!messageContent.startsWith('@ai ')) return
    
    // Check if we already processed this
    if (sendToAI.variables?.messages?.some(m => m.content === messageContent)) return

    if (!cacheState?.currentCenter) {
      chatState.showSystemMessage(
        'Please select a tile to provide context for the AI.',
        'warning'
      )
      return
    }

    // Extract the actual message
    const actualMessage = messageContent.replace(/^@ai\s+/i, '').trim()
    
    if (!actualMessage) {
      chatState.showSystemMessage('Please provide a message after @ai', 'warning')
      return
    }
    
    // Convert messages for API
    const messages: ChatMessage[] = chatState.messages.map((msg: any) => ({
      id: msg.id,
      type: msg.actor as 'user' | 'assistant' | 'system',
      content: msg.content,
      metadata: {
        timestamp: msg.timestamp
      }
    }))

    // Show loading
    chatState.showSystemMessage('AI is thinking...', 'info')

    // Send to AI (we know cacheState is not null here due to the check above)
    sendToAI.mutate({
      centerCoordId: cacheState.currentCenter,
      messages,
      model: 'deepseek/deepseek-r1-0528',
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
        currentCenter: cacheState.currentCenter
      }
    })
  }, [chatState.messages.length, chatState, cacheState?.currentCenter, sendToAI.mutate]) // Optimize dependencies

  return null // This component doesn't render anything
}