import type { ICanvasStrategy } from '~/lib/domains/agentic/services/canvas-strategies/strategy.interface'
import type { CanvasContext, CanvasContextOptions, TileContextItem } from '~/lib/domains/agentic/types'
import type { CacheState } from '~/app/map'
import type { TileData } from '~/app/map'
import { CoordSystem } from '~/lib/domains/mapping/utils/hex-coordinates'

export class ExtendedCanvasStrategy implements ICanvasStrategy {
  constructor(private readonly getCacheState: () => CacheState) {}
  
  async build(
    centerCoordId: string,
    options: CanvasContextOptions
  ): Promise<CanvasContext> {
    const state = this.getCacheState()
    
    // Get all tiles within 3 generations
    const regionTiles = this.getRegionItems(state, centerCoordId, 3)
    
    // Find center tile
    const centerTile = regionTiles.find(t => t.metadata.coordId === centerCoordId)
    if (!centerTile) {
      throw new Error(`Center tile not found: ${centerCoordId}`)
    }
    
    // Group tiles by depth
    const centerDepth = centerTile.metadata.coordinates.path.length
    const children: TileData[] = []
    const grandchildren: TileData[] = []
    const greatGrandchildren: TileData[] = []
    
    regionTiles.forEach(tile => {
      if (tile.metadata.coordId === centerCoordId) return
      
      const tileDepth = tile.metadata.coordinates.path.length
      const relativeDepth = tileDepth - centerDepth
      
      if (relativeDepth === 1) {
        children.push(tile)
      } else if (relativeDepth === 2) {
        grandchildren.push(tile)
      } else if (relativeDepth === 3) {
        greatGrandchildren.push(tile)
      }
    })
    
    // Convert to context items
    const center = this.toContextItem(centerTile, 0)
    const childrenItems = this.filterAndConvert(children, options, 1)
    const grandchildrenItems = this.filterAndConvert(grandchildren, options, 2)
    
    // For extended strategy, include great-grandchildren in the grandchildren array
    const allDescendants = [
      ...grandchildrenItems,
      ...this.filterAndConvert(greatGrandchildren, options, 3)
    ]
    
    return {
      type: 'canvas',
      center,
      children: childrenItems,
      grandchildren: allDescendants, // Includes 2nd and 3rd generation
      strategy: 'extended',
      metadata: {
        computedAt: new Date()
      },
      serialize: (format) => this.serialize(
        { center, children: childrenItems, grandchildren: allDescendants }, 
        format
      )
    }
  }
  
  private filterAndConvert(
    tiles: TileData[], 
    options: CanvasContextOptions,
    depth: number
  ): TileContextItem[] {
    let filtered = tiles
    
    if (!options.includeEmptyTiles) {
      filtered = tiles.filter(t => t.data.name?.trim())
    }
    
    return filtered.map(t => this.toContextItem(t, depth))
  }
  
  private toContextItem(tile: TileData, depth: number): TileContextItem {
    const position = depth > 0 
      ? CoordSystem.getDirection(tile.metadata.coordinates)
      : undefined
      
    return {
      coordId: tile.metadata.coordId,
      name: tile.data.name || '',
      description: tile.data.description || '',
      position,
      depth,
      hasChildren: false
    }
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
  
  private serialize(
    context: { 
      center: TileContextItem
      children: TileContextItem[]
      grandchildren: TileContextItem[] 
    },
    format: { type: string; includeMetadata?: boolean }
  ): string {
    if (format.type === 'structured') {
      const depth2 = context.grandchildren.filter(g => g.depth === 2)
      const depth3 = context.grandchildren.filter(g => g.depth === 3)
      
      return `Center: ${context.center.name}
Children (${context.children.length}): ${context.children.map(c => c.name).join(', ')}
Grandchildren (${depth2.length}): ${depth2.map(g => g.name).join(', ')}
Great-grandchildren (${depth3.length}): ${depth3.map(g => g.name).join(', ')}`
    }
    
    return JSON.stringify(context)
  }
}