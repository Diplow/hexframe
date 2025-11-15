import { useEffect, useRef } from 'react'
import { useChatState } from '~/app/map/Chat'
import { useAIChat } from '~/app/map/Chat/_hooks/useAIChat'
import { loggers } from '~/lib/debug/debug-logger'

/**
 * Hook that integrates AI chat functionality into the chat system
 * This automatically sends user messages to the AI when they start with specific patterns
 */
export function useAIChatIntegration() {
  const chatState = useChatState()
  
  // Always call the hook - it now handles missing context gracefully
  const aiChat = useAIChat()
  const sendToAI = aiChat.sendToAI
  const isGenerating = aiChat.isGenerating
  const lastProcessedMessageId = useRef<string | null>(null)
  const processingMessage = useRef(false)

  useEffect(() => {
    // Find the latest message
    const latestMessage = chatState.messages[chatState.messages.length - 1]
    
    // Only process user messages that haven't been processed yet
    if (latestMessage?.actor !== 'user' || 
        lastProcessedMessageId.current === latestMessage.id) {
      return
    }

    const messageContent = latestMessage.content
    
    // Skip command messages (those starting with /)
    const isCommand = messageContent.startsWith('/')
    
    // Skip if already processing or if it's a command
    if (isCommand || processingMessage.current || !sendToAI) {
      return
    }
    
    // Send all non-command user messages to AI
    processingMessage.current = true
    lastProcessedMessageId.current = latestMessage.id
    
    loggers.agentic('Sending message to AI', {
      message: messageContent,
      actor: latestMessage.actor,
      messageId: latestMessage.id
    })

    // Send to AI (the thinking indicator is shown via isGeneratingAI)
    void sendToAI(messageContent).finally(() => {
      processingMessage.current = false
    })
  }, [chatState.messages, sendToAI, chatState])

  return {
    isGeneratingAI: isGenerating
  }
}