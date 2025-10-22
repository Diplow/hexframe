import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StandardCanvasStrategy } from '~/lib/domains/agentic/services/canvas-strategies/standard.strategy'
import type { CacheState } from '~/app/map'
import type { TileData } from '~/app/map'

describe('StandardCanvasStrategy', () => {
  let mockGetCacheState: () => CacheState
  let strategy: StandardCanvasStrategy
  
  const createMockTile = (
    coordId: string,
    title: string,
    path: number[]
  ): TileData => ({
    metadata: {
      coordId,
      coordinates: {
        userId: 123,
        groupId: 456,
        path
      },
      dbId: 'db-' + coordId,
      parentId: path.length > 0 ? `user:123,group:456${path.length > 1 ? ':' + path.slice(0, -1).join(',') : ''}` : undefined,
      depth: path.length,
      ownerId: 'user:123'
    },
    data: {
      title,
      content: `Description for ${title}`,
      link: '',
      color: 'zinc',
      preview: undefined
    },
    state: {
      isDragged: false,
      isHovered: false,
      isSelected: false,
      isExpanded: false,
      isDragOver: false,
      isHovering: false
    }
  } as unknown as TileData)
  
  const mockCacheState: CacheState = {
    itemsById: {
      'user:123,group:456:1,2': createMockTile('user:123,group:456:1,2', 'Center', [1, 2]),
      'user:123,group:456:1,2,1': createMockTile('user:123,group:456:1,2,1', 'Child NW', [1, 2, 1]),
      'user:123,group:456:1,2,2': createMockTile('user:123,group:456:1,2,2', 'Child NE', [1, 2, 2]),
      'user:123,group:456:1,2,3': createMockTile('user:123,group:456:1,2,3', '', [1, 2, 3]), // Empty tile
      'user:123,group:456:1,2,1,6': createMockTile('user:123,group:456:1,2,1,6', 'Grandchild 1', [1, 2, 1, 6]),
      'user:123,group:456:1,2,1,5': createMockTile('user:123,group:456:1,2,1,5', 'Grandchild 2', [1, 2, 1, 5]),
      'user:123,group:456:1,2,2,3': createMockTile('user:123,group:456:1,2,2,3', 'Grandchild 3', [1, 2, 2, 3]),
      'user:123,group:456:1,2,1,6,2': createMockTile('user:123,group:456:1,2,1,6,2', 'Too Deep', [1, 2, 1, 6, 2]), // Too deep
    },
    currentCenter: 'user:123,group:456:1,2',
    expandedItemIds: [],
    isCompositionExpanded: false,
    isLoading: false,
    error: null,
    lastUpdated: Date.now(),
    cacheConfig: { maxAge: 300000, backgroundRefreshInterval: 60000, enableOptimisticUpdates: true, maxDepth: 5 },
    regionMetadata: {}
  }
  
  beforeEach(() => {
    mockGetCacheState = vi.fn(() => mockCacheState)
    strategy = new StandardCanvasStrategy(mockGetCacheState)
  })
  
  it('should build context with center tile and 2 generations', async () => {
    const result = await strategy.build('user:123,group:456:1,2', {})
    
    expect(result.type).toBe('canvas')
    expect(result.strategy).toBe('standard')
    expect(result.center.title).toBe('Center')
    expect(result.center.depth).toBe(0)
    
    // Check we got some children
    expect(result.children.length).toBeGreaterThan(0)
    expect(result.children.map(c => c.title)).toContain('Child NW')
    expect(result.children.map(c => c.title)).toContain('Child NE')
    
    // Check we got some grandchildren
    expect(result.grandchildren.length).toBeGreaterThan(0)
    expect(result.grandchildren.map(g => g.title)).toContain('Grandchild 1')
    
    // Should not include tiles that are too deep
    expect(result.grandchildren.map(g => g.title)).not.toContain('Too Deep')
  })
  
  it('should filter empty tiles when includeEmptyTiles is false', async () => {
    const result = await strategy.build('user:123,group:456:1,2', {
      includeEmptyTiles: false
    })
    
    // Should filter out the empty child
    expect(result.children).toHaveLength(2)
    expect(result.children.every(c => c.title.trim() !== '')).toBe(true)
  })
  
  it('should include position information for children', async () => {
    const result = await strategy.build('user:123,group:456:1,2', {})
    
    const childNW = result.children.find(c => c.title === 'Child NW')
    const childNE = result.children.find(c => c.title === 'Child NE')
    
    expect(childNW?.position).toBe(1) // Direction.NorthWest
    expect(childNE?.position).toBe(2) // Direction.NorthEast
  })
  
  it('should handle missing center tile gracefully', async () => {
    await expect(
      strategy.build('user:123,group:456:99,99', {})
    ).rejects.toThrow('Center tile not found')
  })
  
  it('should set proper depth values', async () => {
    const result = await strategy.build('user:123,group:456:1,2', {})
    
    expect(result.center.depth).toBe(0)
    expect(result.children.every(c => c.depth === 1)).toBe(true)
    expect(result.grandchildren.every(g => g.depth === 2)).toBe(true)
  })
  
  it('should include descriptions when available', async () => {
    const result = await strategy.build('user:123,group:456:1,2', {
      includeDescriptions: true
    })
    
    expect(result.center.content).toBe('Description for Center')
    expect(result.children[0]?.content).toContain('Description for')
  })
  
  it('should serialize to structured format', async () => {
    const result = await strategy.build('user:123,group:456:1,2', {
      includeEmptyTiles: false
    })
    
    const serialized = result.serialize({ type: 'structured' })
    
    expect(serialized).toContain('Center: Center')
    expect(serialized).toContain('Children (2)')
    expect(serialized).toContain('Child NW')
    expect(serialized).toContain('Grandchildren (3)')
  })
})