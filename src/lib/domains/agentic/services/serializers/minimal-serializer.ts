import type { 
  ComposedContext, 
  CanvasContext,
  ChatContext 
} from '../../types'

export class MinimalContextSerializer {
  serialize(context: ComposedContext): string {
    const parts: string[] = []
    
    for (const ctx of context.contexts) {
      if (ctx.type === 'canvas') {
        const canvas = ctx as CanvasContext
        parts.push(`Current: ${canvas.center.name}`)
        if (canvas.children.length > 0) {
          const childNames = canvas.children.map(child => child.name).join(', ')
          parts.push(`Children: ${childNames}`)
        }
      } else if (ctx.type === 'chat') {
        const chat = ctx as ChatContext
        // Show both last user and assistant messages for context
        const userMessages = chat.messages.filter(m => m.role === 'user')
        const lastUserMsg = userMessages[userMessages.length - 1]
        if (lastUserMsg) {
          const truncated = lastUserMsg.content.length > 50 
            ? lastUserMsg.content.substring(0, 50) + '...'
            : lastUserMsg.content
          parts.push(`User: ${truncated}`)
        }
        const assistantMessages = chat.messages.filter(m => m.role === 'assistant')
        const lastAssistantMsg = assistantMessages[assistantMessages.length - 1]
        if (lastAssistantMsg) {
          const truncated = lastAssistantMsg.content.length > 50
            ? lastAssistantMsg.content.substring(0, 50) + '...'
            : lastAssistantMsg.content
          parts.push(`Assistant: ${truncated}`)
        }
      }
    }
    
    return parts.join('\n')
  }
}