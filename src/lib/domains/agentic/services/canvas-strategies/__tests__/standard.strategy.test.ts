import { describe, it, expect, beforeEach } from 'vitest'
import { StandardCanvasStrategy } from '~/lib/domains/agentic/services/canvas-strategies/standard.strategy'
import { createMockMapContext } from '~/lib/domains/agentic/services/__tests__/__fixtures__/context-mocks'

describe('StandardCanvasStrategy', () => {
  let strategy: StandardCanvasStrategy

  beforeEach(() => {
    strategy = new StandardCanvasStrategy()
  })

  it('should build context with proper hierarchy', async () => {
    const mapContext = createMockMapContext()
    const result = await strategy.build(mapContext, {})

    expect(result.type).toBe('canvas')
    expect(result.strategy).toBe('standard')
    expect(result.center.title).toBe('Center Tile')
    expect(result.center.content).toBe('This is the center tile content')
    expect(result.center.depth).toBe(0)

    // Should have 2 children with previews
    expect(result.children.length).toBe(2)
    expect(result.children.map(c => c.title)).toContain('Child Tile 1')
    expect(result.children.map(c => c.title)).toContain('Child Tile 2')
    expect(result.children[0]?.content).toBe('Preview of child tile 1')

    // Should have 1 grandchild with no content
    expect(result.grandchildren.length).toBe(1)
    expect(result.grandchildren[0]?.title).toBe('Grandchild Tile 1')
    expect(result.grandchildren[0]?.content).toBe('') // No content for grandchildren
  })

  it('should use hierarchical structure from MapContext', async () => {
    const mapContext = createMockMapContext()
    const result = await strategy.build(mapContext, {})

    // Hierarchy is fetched from database via mapping domain
    expect(result.children.length).toBe(2)
    expect(result.grandchildren.length).toBe(1)
  })

  it('should include position information from coordinates', async () => {
    const mapContext = createMockMapContext()
    const result = await strategy.build(mapContext, {})

    const child1 = result.children.find(c => c.title === 'Child Tile 1')

    // Position is derived from coordinates path
    expect(child1?.position).toBe(3) // Direction from path [1,2,1,3]
  })

  it('should handle MapContext with center tile', async () => {
    const mapContext = createMockMapContext()
    const result = await strategy.build(mapContext, {})

    // Should successfully build context from MapContext
    expect(result.center).toBeDefined()
    expect(result.center.coordId).toBe('1,0:1,2')
  })

  it('should set proper depth values for hierarchy', async () => {
    const result = await strategy.build(createMockMapContext(), {})

    expect(result.center.depth).toBe(0)
    expect(result.children.every(c => c.depth === 1)).toBe(true)
    expect(result.grandchildren.every(g => g.depth === 2)).toBe(true)
  })

  it('should include correct detail level per hierarchy', async () => {
    const mapContext = createMockMapContext()
    const result = await strategy.build(mapContext, {})

    // Center: full content
    expect(result.center.content).toBe('This is the center tile content')

    // Children: preview
    expect(result.children[0]?.content).toBe('Preview of child tile 1')

    // Grandchildren: no content
    expect(result.grandchildren[0]?.content).toBe('')
  })

  it('should serialize to structured format with hierarchy', async () => {
    const mapContext = createMockMapContext()
    const result = await strategy.build(mapContext, {})

    const serialized = result.serialize({ type: 'structured' })

    expect(serialized).toContain('Center: Center Tile')
    expect(serialized).toContain('Children (2)')
    expect(serialized).toContain('Child Tile 1')
    expect(serialized).toContain('Grandchildren (1)')
    expect(serialized).toContain('Grandchild Tile 1')
  })
})
