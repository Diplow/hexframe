import type { ICanvasStrategy } from '~/lib/domains/agentic/services/canvas-strategies/strategy.interface'
import type { CanvasContext, CanvasContextOptions, TileContextItem } from '~/lib/domains/agentic/types'
import type { MapContext } from '~/lib/domains/mapping/utils'
import { CoordSystem } from '~/lib/domains/mapping/utils'

export class ExtendedCanvasStrategy implements ICanvasStrategy {
  async build(
    mapContext: MapContext,
    _options: CanvasContextOptions
  ): Promise<CanvasContext> {
    // Convert center with full content
    const center: TileContextItem = {
      coordId: mapContext.center.coords,
      title: mapContext.center.title,
      content: mapContext.center.content,
      depth: 0,
      hasChildren: mapContext.children.length > 0 || mapContext.composed.length > 0
    }

    // Convert composed tiles (direction 0) with full content
    const composed: TileContextItem[] = mapContext.composed.map(comp => ({
      coordId: comp.coords,
      title: comp.title,
      content: comp.content,
      position: CoordSystem.getDirection(CoordSystem.parseId(comp.coords)),
      depth: 0.5,
      hasChildren: false
    }))

    // For extended: include children with FULL content (not just preview)
    const children: TileContextItem[] = mapContext.children.map(child => ({
      coordId: child.coords,
      title: child.title,
      content: child.content, // Full content for extended strategy
      position: CoordSystem.getDirection(CoordSystem.parseId(child.coords)),
      depth: 1,
      hasChildren: mapContext.grandchildren.some(gc => {
        const childCoords = CoordSystem.parseId(child.coords)
        const gcCoords = CoordSystem.parseId(gc.coords)
        return gcCoords.path.length === childCoords.path.length + 2 &&
               gcCoords.path.slice(0, -2).every((v, i) => v === childCoords.path[i])
      })
    }))

    // Extended also includes grandchildren with preview
    const grandchildren: TileContextItem[] = mapContext.grandchildren.map(gc => ({
      coordId: gc.coords,
      title: gc.title,
      content: gc.preview ?? '', // Include preview for grandchildren
      position: CoordSystem.getDirection(CoordSystem.parseId(gc.coords)),
      depth: 2,
      hasChildren: false
    }))

    return {
      type: 'canvas',
      center,
      composed,
      children,
      grandchildren,
      strategy: 'extended',
      metadata: {
        computedAt: new Date()
      },
      serialize: (format) => this.serialize(
        { center, composed, children, grandchildren },
        format
      )
    }
  }

  private serialize(
    context: {
      center: TileContextItem
      composed: TileContextItem[]
      children: TileContextItem[]
      grandchildren: TileContextItem[]
    },
    format: { type: string; includeMetadata?: boolean }
  ): string {
    if (format.type === 'structured') {
      let result = `# Center: ${context.center.title}\n${context.center.content}\n`

      if (context.composed.length > 0) {
        result += `\n## Composed Tiles (${context.composed.length})\n`
        context.composed.forEach(c => {
          result += `### ${c.title}\n${c.content}\n`
        })
      }

      if (context.children.length > 0) {
        result += `\n## Children (${context.children.length})\n`
        context.children.forEach(c => {
          result += `### ${c.title} (Position: ${c.position})\n${c.content}\n`
        })
      }

      if (context.grandchildren.length > 0) {
        result += `\n## Grandchildren (${context.grandchildren.length})\n`
        context.grandchildren.forEach(g => {
          result += `- ${g.title}${g.content ? `: ${g.content}` : ''}\n`
        })
      }

      return result
    }

    return JSON.stringify(context)
  }
}
