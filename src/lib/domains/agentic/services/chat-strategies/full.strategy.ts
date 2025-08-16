import type { IChatStrategy } from './strategy.interface'
import type { ChatContext, ChatContextOptions, ChatContextMessage } from '../../types'
import type { ChatMessage, ChatWidget } from '~/app/map/interface'

export class FullChatStrategy implements IChatStrategy {
  async build(
    messages: ChatMessage[],
    _options: ChatContextOptions
  ): Promise<ChatContext> {
    const contextMessages = messages.map(msg => ({
      role: msg.type,
      content: this.extractTextContent(msg.content),
      timestamp: msg.metadata?.timestamp ?? new Date(),
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
  
  private extractTextContent(content: string | ChatWidget): string {
    if (typeof content === 'string') return content
    
    // Handle widget content extraction
    switch (content.type) {
      case 'preview':
        const previewData = content.data as { title?: string; content?: string }
        return `[Preview Widget: ${previewData.title ?? 'Untitled'}]`
      case 'creation':
        return '[Creation Widget]'
      case 'error':
        const errorData = content.data as { message?: string }
        return `[Error: ${errorData.message ?? 'Unknown error'}]`
      case 'loading':
        const loadingData = content.data as { message?: string }
        return `[Loading: ${loadingData.message ?? 'Loading...'}]`
      default:
        return `[${content.type} widget]`
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