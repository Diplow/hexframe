import type { ICanvasStrategy } from '~/lib/domains/agentic/services/canvas-strategies/strategy.interface'
import type { CanvasContext, CanvasContextOptions, TileContextItem } from '~/lib/domains/agentic/types'
import type { CacheState } from '~/app/map'
import type { TileData } from '~/app/map'
import { CoordSystem } from '~/lib/domains/mapping/utils'

export class MinimalCanvasStrategy implements ICanvasStrategy {
  constructor(private readonly getCacheState: () => CacheState) {}
  
  async build(
    centerCoordId: string,
    _options: CanvasContextOptions
  ): Promise<CanvasContext> {
    const state = this.getCacheState()
    
    // Get only the center tile
    const centerTile = state.itemsById[centerCoordId]
    if (!centerTile) {
      throw new Error(`Center tile not found: ${centerCoordId}`)
    }
    
    const center = this.toContextItem(centerTile, 0)
    
    return {
      type: 'canvas',
      center,
      children: [],
      grandchildren: [],
      strategy: 'minimal',
      metadata: {
        computedAt: new Date()
      },
      serialize: (format) => this.serialize(center, format)
    }
  }
  
  private toContextItem(tile: TileData, depth: number): TileContextItem {
    const position = depth > 0 
      ? CoordSystem.getDirection(tile.metadata.coordinates)
      : undefined
      
    return {
      coordId: tile.metadata.coordId,
      title: tile.data.title || '',
      content: tile.data.content || '',
      position,
      depth,
      hasChildren: false
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