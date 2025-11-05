import type { IChatStrategy } from '~/lib/domains/agentic/services/chat-strategies/strategy.interface'
import type { ChatContext, ChatContextOptions, ChatContextMessage, ChatMessageContract } from '~/lib/domains/agentic/types'

export class FullChatStrategy implements IChatStrategy {
  async build(
    messages: ChatMessageContract[],
    _options: ChatContextOptions
  ): Promise<ChatContext> {
    const contextMessages = messages.map(msg => ({
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
      strategy: 'full',
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
      return messages.map(msg => 
        `### ${msg.role.charAt(0).toUpperCase() + msg.role.slice(1)}\n${msg.content}`
      ).join('\n\n')
    }
    
    return JSON.stringify(messages)
  }
}