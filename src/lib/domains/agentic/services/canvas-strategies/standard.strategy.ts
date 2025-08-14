import type { ICanvasStrategy } from './strategy.interface'
import type { CanvasContext, CanvasContextOptions, TileContextItem } from '../../types'
import type { CacheState } from '~/app/map/Cache/interface'
import type { TileData } from '~/app/map/types/tile-data'
import { CoordSystem } from '~/lib/domains/mapping/utils/hex-coordinates'

export class StandardCanvasStrategy implements ICanvasStrategy {
  constructor(private readonly getCacheState: () => CacheState) {}
  
  async build(
    centerCoordId: string,
    options: CanvasContextOptions
  ): Promise<CanvasContext> {
    const state = this.getCacheState()
    
    // Get all tiles within 2 generations using the same logic as selectRegionItems
    const regionTiles = this.getRegionItems(state, centerCoordId, 2)
    
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
  
  private getRegionItems(state: CacheState, centerCoordId: string, maxDepth: number): TileData[] {
    const regionItems: TileData[] = []
    const centerItem = state.itemsById[centerCoordId]
    
    if (!centerItem) return regionItems
    
    // Add center item
    regionItems.push(centerItem)
    
    // Get center coordinates for hierarchy calculation
    const centerCoords = centerItem.metadata.coordinates
    const centerDepth = centerCoords.path.length
    
    // Add items within the specified depth from center
    Object.values(state.itemsById).forEach((item) => {
      if (item.metadata.coordId === centerCoordId) return // Skip center (already added)
      
      const itemCoords = item.metadata.coordinates
      
      // Check if item belongs to the same coordinate tree
      if (
        itemCoords.userId !== centerCoords.userId ||
        itemCoords.groupId !== centerCoords.groupId
      ) {
        return
      }
      
      // Calculate relative depth from center
      const itemDepth = itemCoords.path.length
      const relativeDepth = itemDepth - centerDepth
      
      // Include items within maxDepth generations from center
      if (relativeDepth > 0 && relativeDepth <= maxDepth) {
        // Check if item is descendant of center
        const isDescendant = centerCoords.path.every(
          (coord, index) => itemCoords.path[index] === coord
        )
        
        if (isDescendant) {
          regionItems.push(item)
        }
      }
    })
    
    return regionItems
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