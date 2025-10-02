import type { 
  ComposedContext, 
  CanvasContext, 
  ChatContext 
} from '~/lib/domains/agentic/types'

export class XMLContextSerializer {
  serialize(context: ComposedContext): string {
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
    const lines: string[] = ['  <canvas>']
    lines.push(`    <current_item>`)
    lines.push(`      <title>${this.escapeXML(context.center.title)}</title>`)
    if (context.center.content) {
      lines.push(`      <content>${this.escapeXML(context.center.content)}</content>`)
    }
    lines.push(`    </current_item>`)

    if (context.children.length > 0) {
      lines.push('    <children>')
      for (const child of context.children) {
        lines.push(`      <child position="${child.position ?? 'unknown'}">`)
        lines.push(`        <title>${this.escapeXML(child.title)}</title>`)
        lines.push(`      </child>`)
      }
      lines.push('    </children>')
    }

    lines.push('  </canvas>')
    return lines.join('\n')
  }

  private serializeChatXML(context: ChatContext): string {
    const lines: string[] = ['  <chat>']
    
    for (const message of context.messages) {
      lines.push(`    <message role="${message.role}">`)
      lines.push(`      ${this.escapeXML(message.content)}`)
      lines.push(`    </message>`)
    }
    
    lines.push('  </chat>')
    return lines.join('\n')
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