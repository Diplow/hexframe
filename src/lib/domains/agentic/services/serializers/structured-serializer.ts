import type { 
  ComposedContext, 
  CanvasContext, 
  ChatContext 
} from '~/lib/domains/agentic/types'
import { Direction } from '~/lib/domains/mapping/utils'

export class StructuredContextSerializer {
  serialize(context: ComposedContext, includeMetadata = false): string {
    const parts: string[] = []
    
    if (includeMetadata && context.metadata.tokenEstimate) {
      parts.push(`Token estimate: ${context.metadata.tokenEstimate}`)
      parts.push('')
    }
    
    for (const ctx of context.contexts) {
      if (ctx.type === 'canvas') {
        parts.push(this.serializeCanvasContext(ctx as CanvasContext))
      } else if (ctx.type === 'chat') {
        parts.push(this.serializeChatContext(ctx as ChatContext))
      }
    }
    
    return parts.join('\n\n---\n\n')
  }

  private serializeCanvasContext(context: CanvasContext): string {
    const lines: string[] = [
      '# Canvas Context',
      '',
      `Current item: ${context.center.title}`
    ]

    if (context.center.content) {
      lines.push(`Content: ${context.center.content}`)
    }

    if (context.children.length === 0) {
      lines.push('No child items')
    } else {
      lines.push('')
      lines.push('## Children:')
      for (const child of context.children) {
        const posLabel = this.getPositionLabel(child.position)
        lines.push(`- ${posLabel}: ${child.title}`)
      }
    }

    if (context.grandchildren.length > 0) {
      lines.push('')
      lines.push('## Grandchildren:')
      const displayCount = Math.min(6, context.grandchildren.length)
      for (let i = 0; i < displayCount; i++) {
        const grandchild = context.grandchildren[i]!
        lines.push(`- ${grandchild.title}`)
      }
      if (context.grandchildren.length > displayCount) {
        lines.push(`- ... and ${context.grandchildren.length - displayCount} more`)
      }
    }

    return lines.join('\n')
  }

  private serializeChatContext(context: ChatContext): string {
    const lines: string[] = ['# Chat History']
    
    for (const message of context.messages) {
      const role = message.role === 'user' ? 'User' : 
                   message.role === 'assistant' ? 'Assistant' :
                   'System'
      lines.push('')
      lines.push(`${role}: ${message.content}`)
    }
    
    return lines.join('\n')
  }

  private getPositionLabel(position?: Direction): string | null {
    if (!position) return null
    
    const labels: Partial<Record<Direction, string>> = {
      [Direction.East]: 'East',
      [Direction.SouthEast]: 'Southeast',
      [Direction.SouthWest]: 'Southwest', 
      [Direction.West]: 'West',
      [Direction.NorthWest]: 'Northwest',
      [Direction.NorthEast]: 'Northeast'
    }
    
    return labels[position] ?? 'Unknown'
  }
}