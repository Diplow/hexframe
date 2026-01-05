import { useEffect, useRef, useState } from 'react'
import { useChatState } from '~/app/map/Chat'
import { useStreamingTaskExecution } from '~/app/map/Chat/Input/_hooks'
import { formatDiscussion } from '~/app/map/Chat/_hooks/_discussion-formatter'
import { authClient } from '~/lib/auth'
import { loggers } from '~/lib/debug/debug-logger'
import { useEventBus } from '~/app/map/Services/EventBus'

/**
 * Hook that integrates AI chat functionality into the chat system.
 * Routes all non-command user messages through executeTask to the USER tile.
 */
export function useAIChatIntegration() {
  const chatState = useChatState()
  const eventBus = useEventBus()
  const [userId, setUserId] = useState<string | null>(null)
  const lastProcessedMessageId = useRef<string | null>(null)
  const processingMessage = useRef(false)

  // Get user ID from auth session
  useEffect(() => {
    void authClient.getSession().then(session => {
      setUserId(session?.data?.user?.id ?? null)
    })
  }, [])

  // Use streaming task execution for USER tile
  // Pass eventBus to enable cache invalidation when hexframe MCP tools complete
  const { executeTask, isStreaming } = useStreamingTaskExecution({ chatState, eventBus })

  // Compute USER tile coordId: "{userId},0" (root tile with default groupId)
  const userTileCoordId = userId ? `${userId},0` : null

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

    // Skip @-mention messages (those handled by Input component directly)
    const hasMention = messageContent.includes('@')

    // Skip if already processing, is a command, has a mention, or no user tile available
    if (isCommand || hasMention || processingMessage.current || !userTileCoordId) {
      return
    }

    // Send all non-command, non-mention user messages to AI via USER tile
    processingMessage.current = true
    lastProcessedMessageId.current = latestMessage.id

    loggers.agentic('Sending message to AI via USER tile', {
      message: messageContent,
      actor: latestMessage.actor,
      messageId: latestMessage.id,
      userTileCoordId
    })

    // Format existing messages (excluding the latest) as discussion context
    const previousMessages = chatState.messages.slice(0, -1)
    const discussion = formatDiscussion(previousMessages)

    // Execute task on USER tile with the user's message as instruction
    executeTask(userTileCoordId, messageContent, discussion)
    processingMessage.current = false
  }, [chatState.messages, executeTask, userTileCoordId, chatState])

  return {
    isGeneratingAI: isStreaming
  }
}
