import type { 
  ComposedContext, 
  CanvasContext, 
  ChatContext,
  SerializationFormat 
} from '../types'
import { Direction } from '~/lib/domains/mapping/utils/hex-coordinates'

export class ContextSerializerService {
  serialize(context: ComposedContext, format: SerializationFormat): string {
    switch (format.type) {
      case 'structured':
        return this.serializeStructured(context, format.includeMetadata)
      case 'narrative':
        return this.serializeNarrative(context)
      case 'minimal':
        return this.serializeMinimal(context)
      case 'xml':
        return this.serializeXML(context)
      default: {
        // Exhaustiveness check - if new format types are added, TypeScript will error
        const _exhaustiveCheck: never = format.type
        return this.serializeStructured(context, false)
      }
    }
  }

  private serializeStructured(context: ComposedContext, includeMetadata = false): string {
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
      '## Tile Hierarchy Context',
      '',
      `### Current Center: ${context.center.name}`,
      context.center.description || ''
    ]
    
    // Add children
    lines.push('')
    lines.push(`### Direct Children (${context.children.length}):`)
    
    if (context.children.length === 0) {
      lines.push('(No children)')
    } else {
      context.children.forEach(child => {
        const position = this.getPositionLabel(child.position)
        const positionStr = position ? `[${position}] ` : ''
        lines.push(`- ${positionStr}${child.name}: ${child.description ?? 'No description'}`)
      })
    }
    
    // Add grandchildren
    if (context.grandchildren.length > 0) {
      lines.push('')
      lines.push(`### Grandchildren (${context.grandchildren.length} total):`)
      const displayCount = Math.min(10, context.grandchildren.length)
      context.grandchildren.slice(0, displayCount).forEach(gc => {
        lines.push(`- ${gc.name}`)
      })
      if (context.grandchildren.length > displayCount) {
        lines.push(`... and ${context.grandchildren.length - displayCount} more`)
      }
    }
    
    return lines.join('\n').trim()
  }

  private serializeChatContext(context: ChatContext): string {
    const lines: string[] = [
      '## Conversation History',
      ''
    ]
    
    context.messages.forEach(msg => {
      lines.push(`### ${msg.role.charAt(0).toUpperCase() + msg.role.slice(1)}`)
      lines.push(msg.content)
      lines.push('')
    })
    
    return lines.join('\n').trim()
  }

  private serializeXML(context: ComposedContext): string {
    const parts: string[] = ['<context>']
    
    for (const ctx of context.contexts) {
      if (ctx.type === 'canvas') {
        parts.push(this.serializeCanvasXML(ctx as CanvasContext))
      } else if (ctx.type === 'chat') {
        parts.push(this.serializeChatXML(ctx as ChatContext))
      }
    }
    
    parts.push('</context>')
    return parts.join('\n')
  }
  
  private serializeCanvasXML(context: CanvasContext): string {
    const lines: string[] = ['  <canvas_context>']
    
    // Center
    lines.push('    <center>')
    lines.push(`      <name>${this.escapeXML(context.center.name)}</name>`)
    lines.push(`      <description>${this.escapeXML(context.center.description)}</description>`)
    lines.push('    </center>')
    
    // Children
    lines.push(`    <children count="${context.children.length}">`)
    context.children.forEach(child => {
      const position = this.getPositionLabel(child.position)
      lines.push(`      <child position="${position ?? 'unpositioned'}">`)
      lines.push(`        <name>${this.escapeXML(child.name)}</name>`)
      lines.push(`        <description>${this.escapeXML(child.description)}</description>`)
      lines.push('      </child>')
    })
    lines.push('    </children>')
    
    lines.push('  </canvas_context>')
    return lines.join('\n')
  }
  
  private serializeChatXML(context: ChatContext): string {
    const lines: string[] = ['  <chat_context>']
    
    context.messages.forEach(msg => {
      lines.push(`    <message role="${msg.role}">`)
      lines.push(`      <content>${this.escapeXML(msg.content)}</content>`)
      lines.push('    </message>')
    })
    
    lines.push('  </chat_context>')
    return lines.join('\n')
  }
  
  private serializeMinimal(context: ComposedContext): string {
    const parts: string[] = []
    
    for (const ctx of context.contexts) {
      if (ctx.type === 'canvas') {
        const canvas = ctx as CanvasContext
        parts.push(`Center: ${canvas.center.name}`)
        if (canvas.children.length > 0) {
          parts.push(`Children: ${canvas.children.map(c => c.name).join(', ')}`)
        }
      } else if (ctx.type === 'chat') {
        const chat = ctx as ChatContext
        chat.messages.forEach(msg => {
          parts.push(`${msg.role}: ${msg.content}`)
        })
      }
    }
    
    return parts.join('\n')
  }
  
  private serializeNarrative(context: ComposedContext): string {
    // Narrative format could be used for more natural language representation
    return this.serializeStructured(context, false)
  }
  
  private getPositionLabel(position?: Direction): string | null {
    if (!position) return null
    
    const labels: Record<Direction, string> = {
      [Direction.Center]: 'Center',
      [Direction.NorthWest]: 'NW',
      [Direction.NorthEast]: 'NE',
      [Direction.East]: 'E',
      [Direction.SouthEast]: 'SE',
      [Direction.SouthWest]: 'SW',
      [Direction.West]: 'W'
    }
    
    return labels[position] || null
  }
  
  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }
}