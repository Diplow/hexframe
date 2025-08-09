import { describe, it, expect, beforeEach } from 'vitest'
import { ContextSerializerService } from '../context-serializer.service'
import type { ComposedContext, CanvasContext, ChatContext, TileContextItem, ChatContextMessage } from '../../types'

describe('ContextSerializerService', () => {
  let serializer: ContextSerializerService

  const mockCenterTile: TileContextItem = {
    coordId: 'user:123,group:456:1,2',
    name: 'Product Development',
    description: 'Main product roadmap and features',
    depth: 0,
    hasChildren: true
  }

  const mockCanvasContext: CanvasContext = {
    type: 'canvas',
    center: mockCenterTile,
    children: [
      { 
        coordId: 'child1', 
        name: 'User Research', 
        description: 'Understanding customer needs', 
        position: 1, 
        depth: 1, 
        hasChildren: false 
      },
      { 
        coordId: 'child2', 
        name: 'Feature Planning', 
        description: 'Prioritizing development work', 
        position: 2, 
        depth: 1, 
        hasChildren: false 
      }
    ],
    grandchildren: [
      { 
        coordId: 'gc1', 
        name: 'User Interviews', 
        description: 'Direct customer feedback', 
        depth: 2, 
        hasChildren: false 
      }
    ],
    strategy: 'standard',
    metadata: { computedAt: new Date() },
    serialize: () => 'Canvas serialized'
  }

  const mockChatMessages: ChatContextMessage[] = [
    {
      role: 'user',
      content: 'Help me organize my product development tiles',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      metadata: { tileId: 'tile-123' }
    },
    {
      role: 'assistant',
      content: 'I can see you have a Product Development center...',
      timestamp: new Date('2024-01-01T10:01:00Z'),
      metadata: { model: 'gpt-4' }
    }
  ]

  const mockChatContext: ChatContext = {
    type: 'chat',
    messages: mockChatMessages,
    strategy: 'full',
    metadata: { computedAt: new Date() },
    serialize: () => 'Chat serialized'
  }

  const mockComposedContext: ComposedContext = {
    type: 'composed',
    contexts: [mockCanvasContext, mockChatContext],
    composition: {
      strategy: 'sequential'
    },
    metadata: {
      computedAt: new Date(),
      tokenEstimate: 200
    },
    serialize: () => 'Composed serialized'
  }

  beforeEach(() => {
    serializer = new ContextSerializerService()
  })

  describe('Structured Format', () => {
    it('should serialize composed context with clear sections', async () => {
      const result = serializer.serialize(mockComposedContext, { type: 'structured' })
      
      expect(result).toContain('# Canvas Context')
      expect(result).toContain('Current item: Product Development')
      expect(result).toContain('## Children:')
      expect(result).toContain('Northwest: User Research')
      expect(result).toContain('# Chat History')
      expect(result).toContain('User: Help me organize my product development tiles')
    })
    
    it('should handle empty sections gracefully', async () => {
      const emptyCanvasContext: CanvasContext = {
        ...mockCanvasContext,
        children: [],
        grandchildren: []
      }
      
      const emptyComposed: ComposedContext = {
        ...mockComposedContext,
        contexts: [emptyCanvasContext]
      }
      
      const result = serializer.serialize(emptyComposed, { type: 'structured' })
      
      expect(result).toContain('No child items')
      expect(result).not.toContain('undefined')
    })
  })
  
  describe('XML Format', () => {
    it('should produce valid XML for Claude models', async () => {
      const result = serializer.serialize(mockComposedContext, { type: 'xml' })
      
      expect(result).toContain('<context>')
      expect(result).toContain('</context>')
      expect(result).toContain('<canvas>')
      expect(result).toContain('<current_item>')
      expect(result).toContain('<name>Product Development</name>')
      expect(result).toContain('<children>')
      expect(result).toContain('<chat>')
      expect(result).toContain('<message role="user">')
    })
    
    it('should include all metadata in XML attributes', async () => {
      const result = serializer.serialize(mockComposedContext, { type: 'xml' })
      
      expect(result).toContain('position="1"')
      expect(result).toContain('role="user"')
    })
    
    it('should escape special XML characters', async () => {
      const contextWithSpecialChars: CanvasContext = {
        ...mockCanvasContext,
        center: {
          ...mockCenterTile,
          name: 'Product & Development <Test>',
          description: 'Features with "quotes" and & symbols'
        }
      }
      
      const composed: ComposedContext = {
        ...mockComposedContext,
        contexts: [contextWithSpecialChars]
      }
      
      const result = serializer.serialize(composed, { type: 'xml' })
      
      expect(result).toContain('Product &amp; Development &lt;Test&gt;')
      expect(result).toContain('Features with &quot;quotes&quot; and &amp; symbols')
    })
  })
  
  describe('Minimal Format', () => {
    it('should produce compact representation', async () => {
      const result = serializer.serialize(mockComposedContext, { type: 'minimal' })
      
      expect(result).not.toContain('##')
      expect(result).not.toContain('###')
      expect(result).toContain('Product Development')
      expect(result).toContain('User Research')
      expect(result).toContain('User: Help me organize')
      expect(result.length).toBeLessThan(
        serializer.serialize(mockComposedContext, { type: 'structured' }).length
      )
    })
  })
  
  it('should handle single context type', async () => {
    const singleContext: ComposedContext = {
      ...mockComposedContext,
      contexts: [mockCanvasContext]
    }
    
    const result = serializer.serialize(singleContext, { type: 'structured' })
    
    expect(result).toContain('# Canvas Context')
    expect(result).not.toContain('# Chat History')
  })
  
  it('should respect includeMetadata option', async () => {
    const resultWithMeta = serializer.serialize(mockComposedContext, { 
      type: 'structured', 
      includeMetadata: true 
    })
    
    const resultWithoutMeta = serializer.serialize(mockComposedContext, { 
      type: 'structured', 
      includeMetadata: false 
    })
    
    expect(resultWithMeta).toContain('Token estimate: 200')
    expect(resultWithoutMeta).not.toContain('Token estimate')
  })
})