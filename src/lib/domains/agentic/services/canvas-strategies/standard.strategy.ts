import type { ICanvasStrategy } from './strategy.interface'
import type { CanvasContext, CanvasContextOptions, TileContextItem } from '../../types'
import type { CacheState } from '~/app/map/Cache/State/types'
import { selectRegionItems } from '~/app/map/Cache/State/selectors'
import type { TileData } from '~/app/map/types/tile-data'
import { CoordSystem } from '~/lib/domains/mapping/utils/hex-coordinates'

export class StandardCanvasStrategy implements ICanvasStrategy {
  constructor(private readonly getCacheState: () => CacheState) {}
  
  async build(
    centerCoordId: string,
    options: CanvasContextOptions
  ): Promise<CanvasContext> {
    const state = this.getCacheState()
    
    // Get all tiles within 2 generations
    const regionTiles = selectRegionItems({ 
      state, 
      centerCoordId, 
      maxDepth: 2 
    })
    
    // Find center tile
    const centerTile = regionTiles.find(t => t.metadata.coordId === centerCoordId)
    if (!centerTile) {
      throw new Error(`Center tile not found: ${centerCoordId}`)
    }
    
    // Group tiles by depth
    const { children, grandchildren } = this.groupTilesByDepth(regionTiles, centerTile)
    
    // Convert to context items
    const center = this.toContextItem(centerTile, 0, children.length > 0)
    const childrenItems = this.filterAndConvert(children, options, 1, grandchildren)
    const grandchildrenItems = this.filterAndConvert(grandchildren, options, 2)
    
    return {
      type: 'canvas',
      center,
      children: childrenItems,
      grandchildren: grandchildrenItems,
      strategy: 'standard',
      metadata: {
        computedAt: new Date()
      },
      serialize: (format) => this.serialize(
        { center, children: childrenItems, grandchildren: grandchildrenItems }, 
        format
      )
    }
  }

  private groupTilesByDepth(
    regionTiles: TileData[],
    centerTile: TileData
  ): { children: TileData[], grandchildren: TileData[] } {
    const centerDepth = centerTile.metadata.coordinates.path.length
    const children: TileData[] = []
    const grandchildren: TileData[] = []
    
    regionTiles.forEach(tile => {
      if (tile.metadata.coordId === centerTile.metadata.coordId) return
      
      const tileDepth = tile.metadata.coordinates.path.length
      const relativeDepth = tileDepth - centerDepth
      
      if (relativeDepth === 1) {
        children.push(tile)
      } else if (relativeDepth === 2) {
        grandchildren.push(tile)
      }
    })
    
    return { children, grandchildren }
  }
  
  private filterAndConvert(
    tiles: TileData[], 
    options: CanvasContextOptions,
    depth: number,
    childTiles?: TileData[]
  ): TileContextItem[] {
    let filtered = tiles
    
    if (!options.includeEmptyTiles) {
      filtered = tiles.filter(t => t.data.name?.trim())
    }
    
    return filtered.map(t => {
      // Check if this tile has children (for depth 1 tiles, check grandchildren)
      const hasChildren = childTiles 
        ? childTiles.some(child => child.metadata.parentId === t.metadata.coordId)
        : false
      return this.toContextItem(t, depth, hasChildren)
    })
  }
  
  private toContextItem(tile: TileData, depth: number, hasChildren = false): TileContextItem {
    const position = depth > 0 
      ? CoordSystem.getDirection(tile.metadata.coordinates)
      : undefined
      
    return {
      coordId: tile.metadata.coordId,
      name: tile.data.name || '',
      description: tile.data.description || '',
      position,
      depth,
      hasChildren
    }
  }
  
  private serialize(
    context: { 
      center: TileContextItem
      children: TileContextItem[]
      grandchildren: TileContextItem[] 
    },
    format: { type: string; includeMetadata?: boolean }
  ): string {
    // Basic serialization - will be replaced by proper serializer
    if (format.type === 'structured') {
      return `Center: ${context.center.name}
Children (${context.children.length}): ${context.children.map(c => c.name).join(', ')}
Grandchildren (${context.grandchildren.length}): ${context.grandchildren.map(g => g.name).join(', ')}`
    }
    
    return JSON.stringify(context)
  }
}