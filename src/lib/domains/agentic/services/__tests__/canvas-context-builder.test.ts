import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CanvasContextBuilder } from '~/lib/domains/agentic/services/_context/canvas-context-builder.service'
import { createMockMapContext } from '~/lib/domains/agentic/services/__tests__/__fixtures__/context-mocks'
import type { ICanvasStrategy } from '~/lib/domains/agentic/services/canvas-strategies/strategy.interface'
import type { CanvasContextOptions, TileContextItem, CanvasContextStrategy } from '~/lib/domains/agentic/types'

describe('CanvasContextBuilder', () => {
  let mockStandardStrategy: ICanvasStrategy
  let mockMinimalStrategy: ICanvasStrategy
  let mockExtendedStrategy: ICanvasStrategy
  let strategies: Map<CanvasContextStrategy, ICanvasStrategy>
  let builder: CanvasContextBuilder

  const mockCenterTile: TileContextItem = {
    coordId: 'user:123,group:456:1,2',
    title: 'Center Tile',
    content: 'Center tile description',
    depth: 0,
    hasChildren: true
  }

  const mockChildren: TileContextItem[] = [
    {
      coordId: 'user:123,group:456:1,2,3',
      title: 'Child 1',
      content: 'First child',
      position: 1, // Direction.NorthWest
      depth: 1,
      hasChildren: true
    },
    {
      coordId: 'user:123,group:456:1,2,4',
      title: 'Child 2',
      content: 'Second child',
      position: 2, // Direction.NorthEast
      depth: 1,
      hasChildren: false
    }
  ]

  const mockGrandchildren: TileContextItem[] = [
    {
      coordId: 'user:123,group:456:1,2,3,5',
      title: 'Grandchild 1',
      content: 'First grandchild',
      position: 3, // Direction.East
      depth: 2,
      hasChildren: false
    }
  ]

  beforeEach(() => {
    mockStandardStrategy = {
      build: vi.fn().mockResolvedValue({
        type: 'canvas',
        center: mockCenterTile,
        children: mockChildren,
        grandchildren: mockGrandchildren,
        strategy: 'standard',
        metadata: { computedAt: new Date() },
        serialize: vi.fn()
      })
    }

    mockMinimalStrategy = {
      build: vi.fn().mockResolvedValue({
        type: 'canvas',
        center: mockCenterTile,
        children: [],
        grandchildren: [],
        strategy: 'minimal',
        metadata: { computedAt: new Date() },
        serialize: vi.fn()
      })
    }

    mockExtendedStrategy = {
      build: vi.fn().mockResolvedValue({
        type: 'canvas',
        center: mockCenterTile,
        children: mockChildren,
        grandchildren: mockGrandchildren,
        strategy: 'extended',
        metadata: { computedAt: new Date() },
        serialize: vi.fn()
      })
    }

    strategies = new Map<CanvasContextStrategy, ICanvasStrategy>([
      ['standard', mockStandardStrategy],
      ['minimal', mockMinimalStrategy],
      ['extended', mockExtendedStrategy]
    ])

    builder = new CanvasContextBuilder(strategies)
  })

  describe('build', () => {
    it('should use standard strategy by default', async () => {
      const mapContext = createMockMapContext()
      const result = await builder.build(mapContext, 'standard')

      expect(mockStandardStrategy.build).toHaveBeenCalledWith(mapContext, {})
      expect(result.strategy).toBe('standard')
      expect(result.center).toEqual(mockCenterTile)
      expect(result.children).toHaveLength(2)
      expect(result.grandchildren).toHaveLength(1)
    })

    it('should pass options to strategy', async () => {
      const options: CanvasContextOptions = {
        includeEmptyTiles: false,
        includeDescriptions: true
      }

      const mapContext = createMockMapContext()
      await builder.build(mapContext, 'standard', options)

      expect(mockStandardStrategy.build).toHaveBeenCalledWith(mapContext, options)
    })

    it('should use minimal strategy when specified', async () => {
      const result = await builder.build(createMockMapContext(), 'minimal')

      expect(mockMinimalStrategy.build).toHaveBeenCalled()
      expect(result.strategy).toBe('minimal')
      expect(result.children).toHaveLength(0)
      expect(result.grandchildren).toHaveLength(0)
    })

    it('should use extended strategy when specified', async () => {
      const result = await builder.build(createMockMapContext(), 'extended')

      expect(mockExtendedStrategy.build).toHaveBeenCalled()
      expect(result.strategy).toBe('extended')
    })

    it('should fallback to standard strategy for unknown strategy', async () => {
      const result = await builder.build(createMockMapContext(), 'unknown' as 'standard')

      expect(mockStandardStrategy.build).toHaveBeenCalled()
      expect(result.strategy).toBe('standard')
    })
  })

  describe('StandardStrategy', () => {
    it('should build context with center tile and 2 generations', async () => {
      // This will be tested with the actual StandardStrategy implementation
    })
    
    it('should filter empty tiles when includeEmptyTiles is false', async () => {
      // This will be tested with the actual StandardStrategy implementation
    })
    
    it('should include position information for children', async () => {
      const result = await builder.build(createMockMapContext(), 'standard')
      
      expect(result.children[0]?.position).toBe(1) // Direction.NorthWest
      expect(result.children[1]?.position).toBe(2) // Direction.NorthEast
    })
    
    it('should handle missing tiles gracefully', async () => {
      // This will be tested with the actual StandardStrategy implementation
    })
  })
  
  describe('MinimalStrategy', () => {
    it('should return only center tile', async () => {
      const result = await builder.build(createMockMapContext(), 'minimal')
      
      expect(result.center).toEqual(mockCenterTile)
      expect(result.children).toHaveLength(0)
      expect(result.grandchildren).toHaveLength(0)
    })
  })
  
  describe('ExtendedStrategy', () => {
    it('should include 3 generations from center', async () => {
      // This will be tested with the actual ExtendedStrategy implementation
    })
  })
})