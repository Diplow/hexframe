import type { ICanvasStrategy } from '~/lib/domains/agentic/services/canvas-strategies/strategy.interface'
import type { CanvasContext, CanvasContextOptions, TileContextItem, AIContextSnapshot } from '~/lib/domains/agentic/types'
import { CoordSystem } from '~/lib/domains/mapping/utils'

export class StandardCanvasStrategy implements ICanvasStrategy {
  constructor(private readonly getContextSnapshot: () => AIContextSnapshot) {}

  async build(
    centerCoordId: string,
    _options: CanvasContextOptions
  ): Promise<CanvasContext> {
    const snapshot = this.getContextSnapshot()

    // Get center from snapshot
    if (!snapshot.center || snapshot.center.coordId !== centerCoordId) {
      throw new Error(`Center tile not found: ${centerCoordId}`)
    }

    // Convert center with full content
    const center: TileContextItem = {
      coordId: snapshot.center.coordId,
      title: snapshot.center.title,
      content: snapshot.center.content ?? '',
      depth: 0,
      hasChildren: snapshot.children.length > 0 || snapshot.composed.length > 0
    }

    // Convert composed tiles (direction 0) with full content + preview
    const composed: TileContextItem[] = snapshot.composed.map(comp => ({
      coordId: comp.coordId,
      title: comp.title,
      content: comp.content ?? '',
      position: CoordSystem.getDirection(comp.coordinates),
      depth: 0.5, // Between center and children
      hasChildren: false
    }))

    // Convert children with preview (or content if available)
    const children: TileContextItem[] = snapshot.children.map(child => ({
      coordId: child.coordId,
      title: child.title,
      content: child.preview ?? child.content ?? '',
      position: CoordSystem.getDirection(child.coordinates),
      depth: 1,
      hasChildren: snapshot.expandedTileIds.includes(child.coordId)
    }))

    // Convert grandchildren with just title
    const grandchildren: TileContextItem[] = snapshot.grandchildren.map(gc => ({
      coordId: gc.coordId,
      title: gc.title,
      content: '', // Grandchildren don't get content
      position: CoordSystem.getDirection(gc.coordinates),
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