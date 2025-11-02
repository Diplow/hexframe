import type { ICanvasStrategy } from '~/lib/domains/agentic/services/canvas-strategies/strategy.interface'
import type { CanvasContext, CanvasContextOptions, TileContextItem, AIContextSnapshot } from '~/lib/domains/agentic/types'

export class MinimalCanvasStrategy implements ICanvasStrategy {
  constructor(private readonly getContextSnapshot: () => AIContextSnapshot) {}

  async build(
    centerCoordId: string,
    _options: CanvasContextOptions
  ): Promise<CanvasContext> {
    const snapshot = this.getContextSnapshot()

    // Get only the center tile
    if (!snapshot.center || snapshot.center.coordId !== centerCoordId) {
      throw new Error(`Center tile not found: ${centerCoordId}`)
    }

    const center: TileContextItem = {
      coordId: snapshot.center.coordId,
      title: snapshot.center.title,
      content: snapshot.center.content ?? '',
      depth: 0,
      hasChildren: false
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