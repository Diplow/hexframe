import type { ICanvasStrategy } from '~/lib/domains/agentic/services/canvas-strategies/strategy.interface'
import type { CanvasContext, CanvasContextOptions, TileContextItem } from '~/lib/domains/agentic/types'
import type { MapContext } from '~/lib/domains/mapping/utils'

export class MinimalCanvasStrategy implements ICanvasStrategy {
  async build(
    mapContext: MapContext,
    _options: CanvasContextOptions
  ): Promise<CanvasContext> {
    // Get only the center tile
    const center: TileContextItem = {
      coordId: mapContext.center.coords,
      title: mapContext.center.title,
      content: mapContext.center.content,
      depth: 0,
      hasChildren: Boolean(mapContext.children && mapContext.children.length > 0)
    }

    return {
      type: 'canvas',
      center,
      composed: [], // Minimal strategy doesn't include composed
      children: [],
      grandchildren: [],
      strategy: 'minimal',
      metadata: {
        computedAt: new Date()
      },
      serialize: (format) => this.serialize(center, format)
    }
  }
  
  private serialize(
    center: TileContextItem,
    format: { type: string; includeMetadata?: boolean }
  ): string {
    if (format.type === 'structured') {
      return `Center: ${center.title}${center.content ? `\n${center.content}` : ''}`
    }

    return JSON.stringify({ center })
  }
}