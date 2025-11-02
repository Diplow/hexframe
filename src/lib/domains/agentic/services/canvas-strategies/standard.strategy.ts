import type { ICanvasStrategy } from '~/lib/domains/agentic/services/canvas-strategies/strategy.interface'
import type { CanvasContext, CanvasContextOptions, TileContextItem } from '~/lib/domains/agentic/types'
import type { MapContext } from '~/lib/domains/mapping/utils'
import { CoordSystem } from '~/lib/domains/mapping/utils'

export class StandardCanvasStrategy implements ICanvasStrategy {
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
      depth: 0.5, // Between center and children
      hasChildren: false
    }))

    // Convert children with preview (or content if available)
    const children: TileContextItem[] = mapContext.children.map(child => ({
      coordId: child.coords,
      title: child.title,
      content: child.preview ?? child.content,
      position: CoordSystem.getDirection(CoordSystem.parseId(child.coords)),
      depth: 1,
      hasChildren: mapContext.grandchildren.some(gc => {
        // Check if this child has any grandchildren
        const childCoords = CoordSystem.parseId(child.coords)
        const gcCoords = CoordSystem.parseId(gc.coords)
        return gcCoords.path.length === childCoords.path.length + 2 &&
               gcCoords.path.slice(0, -2).every((v, i) => v === childCoords.path[i])
      })
    }))

    // Convert grandchildren with just title
    const grandchildren: TileContextItem[] = mapContext.grandchildren.map(gc => ({
      coordId: gc.coords,
      title: gc.title,
      content: '', // Grandchildren don't get content
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
      strategy: 'standard',
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
    // Structured serialization with hierarchy
    if (format.type === 'structured') {
      let result = `Center: ${context.center.title}`

      if (context.composed.length > 0) {
        result += `\nComposed (${context.composed.length}): ${context.composed.map(c => c.title).join(', ')}`
      }

      if (context.children.length > 0) {
        result += `\nChildren (${context.children.length}): ${context.children.map(c => c.title).join(', ')}`
      }

      if (context.grandchildren.length > 0) {
        result += `\nGrandchildren (${context.grandchildren.length}): ${context.grandchildren.map(g => g.title).join(', ')}`
      }

      return result
    }

    return JSON.stringify(context)
  }
}