import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StandardCanvasStrategy } from '~/lib/domains/agentic/services/canvas-strategies/standard.strategy'
import type { AIContextSnapshot } from '~/lib/domains/agentic/types'

describe('StandardCanvasStrategy', () => {
  let mockGetContextSnapshot: () => AIContextSnapshot
  let strategy: StandardCanvasStrategy

  // Mock AIContextSnapshot with hierarchical structure
  const mockContextSnapshot: AIContextSnapshot = {
    centerCoordId: 'user:123,group:456:1,2',
    center: {
      coordId: 'user:123,group:456:1,2',
      coordinates: { userId: 123, groupId: 456, path: [1, 2] },
      title: 'Center',
      content: 'Description for Center'
    },
    composed: [],
    children: [
      {
        coordId: 'user:123,group:456:1,2,1',
        coordinates: { userId: 123, groupId: 456, path: [1, 2, 1] },
        title: 'Child NW',
        preview: 'Preview for Child NW'
      },
      {
        coordId: 'user:123,group:456:1,2,2',
        coordinates: { userId: 123, groupId: 456, path: [1, 2, 2] },
        title: 'Child NE',
        preview: 'Preview for Child NE'
      }
    ],
    grandchildren: [
      {
        coordId: 'user:123,group:456:1,2,1,6',
        coordinates: { userId: 123, groupId: 456, path: [1, 2, 1, 6] },
        title: 'Grandchild 1'
      },
      {
        coordId: 'user:123,group:456:1,2,1,5',
        coordinates: { userId: 123, groupId: 456, path: [1, 2, 1, 5] },
        title: 'Grandchild 2'
      },
      {
        coordId: 'user:123,group:456:1,2,2,3',
        coordinates: { userId: 123, groupId: 456, path: [1, 2, 2, 3] },
        title: 'Grandchild 3'
      }
    ],
    expandedTileIds: []
  }

  beforeEach(() => {
    mockGetContextSnapshot = vi.fn(() => mockContextSnapshot)
    strategy = new StandardCanvasStrategy(mockGetContextSnapshot)
  })

  it('should build context with proper hierarchy', async () => {
    const result = await strategy.build('user:123,group:456:1,2', {})

    expect(result.type).toBe('canvas')
    expect(result.strategy).toBe('standard')
    expect(result.center.title).toBe('Center')
    expect(result.center.content).toBe('Description for Center')
    expect(result.center.depth).toBe(0)

    // Should have 2 children with previews
    expect(result.children.length).toBe(2)
    expect(result.children.map(c => c.title)).toContain('Child NW')
    expect(result.children.map(c => c.title)).toContain('Child NE')
    expect(result.children[0]?.content).toBe('Preview for Child NW')

    // Should have 3 grandchildren with just titles
    expect(result.grandchildren.length).toBe(3)
    expect(result.grandchildren.map(g => g.title)).toContain('Grandchild 1')
    expect(result.grandchildren[0]?.content).toBe('') // No content for grandchildren
  })

  it('should use hierarchical structure from snapshot', async () => {
    const result = await strategy.build('user:123,group:456:1,2', {})

    // Hierarchy is determined by frontend converter
    expect(result.children.length).toBe(2)
    expect(result.grandchildren.length).toBe(3)
  })

  it('should include position information from coordinates', async () => {
    const result = await strategy.build('user:123,group:456:1,2', {})

    const childNW = result.children.find(c => c.title === 'Child NW')

    // Position is derived from coordinates
    expect(childNW?.position).toBe(1) // Direction.NorthWest
  })

  it('should handle missing center tile gracefully', async () => {
    await expect(
      strategy.build('user:123,group:456:99,99', {})
    ).rejects.toThrow('Center tile not found')
  })

  it('should set proper depth values for hierarchy', async () => {
    const result = await strategy.build('user:123,group:456:1,2', {})

    expect(result.center.depth).toBe(0)
    expect(result.children.every(c => c.depth === 1)).toBe(true)
    expect(result.grandchildren.every(g => g.depth === 2)).toBe(true)
  })

  it('should include correct detail level per hierarchy', async () => {
    const result = await strategy.build('user:123,group:456:1,2', {})

    // Center: full content
    expect(result.center.content).toBe('Description for Center')

    // Children: preview
    expect(result.children[0]?.content).toBe('Preview for Child NW')

    // Grandchildren: no content
    expect(result.grandchildren[0]?.content).toBe('')
  })

  it('should serialize to structured format with hierarchy', async () => {
    const result = await strategy.build('user:123,group:456:1,2', {})

    const serialized = result.serialize({ type: 'structured' })

    expect(serialized).toContain('Center: Center')
    expect(serialized).toContain('Children (2)')
    expect(serialized).toContain('Child NW')
    expect(serialized).toContain('Grandchildren (3)')
    expect(serialized).toContain('Grandchild 1')
  })
})
