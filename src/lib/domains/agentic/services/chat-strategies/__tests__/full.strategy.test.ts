import { describe, it, expect, beforeEach } from 'vitest'
import { FullChatStrategy } from '~/lib/domains/agentic/services/chat-strategies/full.strategy'
import type { ChatMessageContract } from '~/lib/domains/agentic/types'

describe('FullChatStrategy', () => {
  let strategy: FullChatStrategy
  
  const mockMessages: ChatMessageContract[] = [
    {
      id: '1',
      type: 'user',
      content: 'Hello, can you help me?',
      metadata: {
        timestamp: '2024-01-01T10:00:00.000Z',
        tileId: 'tile-123'
      }
    },
    {
      id: '2',
      type: 'assistant',
      content: 'Of course! What do you need help with?',
      metadata: {
        timestamp: '2024-01-01T10:01:00.000Z'
      }
    },
    {
      id: '3',
      type: 'user',
      content: JSON.stringify({
        type: 'tile',
        data: { title: 'My Tile', content: 'Tile content', tileId: 'tile-456' }
      }),
      metadata: {
        timestamp: '2024-01-01T10:02:00.000Z',
        tileId: 'tile-456'
      }
    },
    {
      id: '4',
      type: 'system',
      content: 'System notification',
      metadata: {
        timestamp: '2024-01-01T10:03:00.000Z'
      }
    }
  ]
  
  beforeEach(() => {
    strategy = new FullChatStrategy()
  })
  
  it('should include all chat messages', async () => {
    const result = await strategy.build(mockMessages, {})
    
    expect(result.type).toBe('chat')
    expect(result.strategy).toBe('full')
    expect(result.messages).toHaveLength(4)
  })
  
  it('should handle serialized widget messages', async () => {
    const result = await strategy.build(mockMessages, {})

    const widgetMessage = result.messages[2]
    // ChatMessageContract always has string content (widgets pre-serialized)
    expect(widgetMessage?.content).toContain('My Tile')
  })
  
  it('should preserve message metadata', async () => {
    const result = await strategy.build(mockMessages, {})

    const firstMessage = result.messages[0]
    expect(firstMessage?.metadata?.tileId).toBe('tile-123')
    expect(firstMessage?.timestamp).toEqual(new Date('2024-01-01T10:00:00.000Z'))
    expect(firstMessage?.role).toBe('user')
  })
  
  it('should handle messages without metadata', async () => {
    const messageWithoutMetadata: ChatMessageContract = {
      id: '5',
      type: 'user',
      content: 'Test message'
    }

    const result = await strategy.build([messageWithoutMetadata], {})

    expect(result.messages[0]?.timestamp).toBeInstanceOf(Date)
    expect(result.messages[0]?.metadata?.tileId).toBeUndefined()
  })
  
  it('should handle serialized widget content', async () => {
    const widgetMessages: ChatMessageContract[] = [
      {
        id: '1',
        type: 'user',
        content: JSON.stringify({ type: 'creation', data: {} })
      },
      {
        id: '2',
        type: 'user',
        content: JSON.stringify({ type: 'error', data: { message: 'Something went wrong' } })
      },
      {
        id: '3',
        type: 'user',
        content: JSON.stringify({ type: 'loading', data: { message: 'Creating tile...' } })
      },
      {
        id: '4',
        type: 'user',
        content: JSON.stringify({ type: 'search', data: {} })
      }
    ]

    const result = await strategy.build(widgetMessages, {})

    // Content is already serialized as JSON strings
    expect(result.messages[0]?.content).toContain('creation')
    expect(result.messages[1]?.content).toContain('Something went wrong')
    expect(result.messages[2]?.content).toContain('Creating tile...')
    expect(result.messages[3]?.content).toContain('search')
  })
  
  it('should serialize to structured format', async () => {
    const result = await strategy.build(mockMessages.slice(0, 2), {})
    
    const serialized = result.serialize({ type: 'structured' })
    
    expect(serialized).toContain('### User')
    expect(serialized).toContain('Hello, can you help me?')
    expect(serialized).toContain('### Assistant')
    expect(serialized).toContain('Of course! What do you need help with?')
  })
  
  it('should serialize to JSON format', async () => {
    const result = await strategy.build(mockMessages.slice(0, 1), {})
    
    const parsed = JSON.parse(JSON.stringify(result.messages)) as Array<{ role: string; content: string }>
    
    expect(parsed).toHaveLength(1)
    expect(parsed[0]?.role).toBe('user')
    expect(parsed[0]?.content).toBe('Hello, can you help me?')
  })
})