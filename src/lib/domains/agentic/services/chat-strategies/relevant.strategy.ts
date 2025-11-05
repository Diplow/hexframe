import type { IChatStrategy } from '~/lib/domains/agentic/services/chat-strategies/strategy.interface'
import type { ChatContext, ChatContextOptions, ChatContextMessage, ChatMessageContract } from '~/lib/domains/agentic/types'

export class RelevantChatStrategy implements IChatStrategy {
  async build(
    messages: ChatMessageContract[],
    options: ChatContextOptions
  ): Promise<ChatContext> {
    const relevantTileIds = options.relevantTileIds ?? []

    // Filter messages that mention relevant tiles
    const relevantMessages = relevantTileIds.length > 0
      ? messages.filter(msg =>
          msg.metadata?.tileId && relevantTileIds.includes(msg.metadata.tileId)
        )
      : messages.filter(msg => msg.metadata?.tileId) // Any message with a tileId

    const contextMessages = relevantMessages.map(msg => ({
      role: msg.type,
      content: msg.content, // Already a string - no extraction needed
      timestamp: msg.metadata?.timestamp ? new Date(msg.metadata.timestamp) : new Date(),
      metadata: {
        tileId: msg.metadata?.tileId,
        model: msg.type === 'assistant' ? 'assistant' : undefined
      }
    }))
    
    return {
      type: 'chat',
      messages: contextMessages,
      strategy: 'relevant',
      metadata: {
        computedAt: new Date()
      },
      serialize: (format) => this.serialize(contextMessages, format)
    }
  }
  private serialize(
    messages: ChatContextMessage[],
    format: { type: string; includeMetadata?: boolean }
  ): string {
    if (format.type === 'structured') {
      return `## Tile-Relevant Messages (${messages.length})\n\n` + 
        messages.map(msg => {
          const header = `### ${msg.role.charAt(0).toUpperCase() + msg.role.slice(1)}`
          const tileInfo = msg.metadata?.tileId ? ` (Tile: ${msg.metadata.tileId})` : ''
          return `${header}${tileInfo}\n${msg.content}`
        }).join('\n\n')
    }
    
    return JSON.stringify(messages)
  }
}