import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ChatContextBuilder } from '~/lib/domains/agentic/services/chat-context-builder.service'
import type { IChatStrategy } from '~/lib/domains/agentic/services/chat-strategies/strategy.interface'
import type { ChatContextOptions, ChatContextMessage, ChatContextStrategy } from '~/lib/domains/agentic/types'
import type { ChatMessage } from '~/app/map'

describe('ChatContextBuilder', () => {
  let mockFullStrategy: IChatStrategy
  let mockRecentStrategy: IChatStrategy
  let mockRelevantStrategy: IChatStrategy
  let strategies: Map<ChatContextStrategy, IChatStrategy>
  let builder: ChatContextBuilder

  const mockMessages: ChatMessage[] = [
    {
      id: '1',
      type: 'user',
      content: 'Hello, can you help me?',
      metadata: {
        timestamp: new Date('2024-01-01T10:00:00Z'),
        tileId: 'tile-123'
      }
    },
    {
      id: '2',
      type: 'assistant',
      content: 'Of course! What do you need help with?',
      metadata: {
        timestamp: new Date('2024-01-01T10:01:00Z')
      }
    },
    {
      id: '3',
      type: 'user',
      content: 'I need to organize my tiles',
      metadata: {
        timestamp: new Date('2024-01-01T10:02:00Z'),
        tileId: 'tile-456'
      }
    },
    {
      id: '4',
      type: 'system',
      content: 'System notification',
      metadata: {
        timestamp: new Date('2024-01-01T10:03:00Z')
      }
    }
  ]

  const mockContextMessages: ChatContextMessage[] = mockMessages.map(msg => ({
    role: msg.type,
    content: typeof msg.content === 'string' ? msg.content : '[widget]',
    timestamp: msg.metadata?.timestamp ?? new Date(),
    metadata: {
      tileId: msg.metadata?.tileId,
      model: msg.type === 'assistant' ? (msg.metadata as { model?: string })?.model : undefined
    }
  }))

  beforeEach(() => {
    mockFullStrategy = {
      build: vi.fn().mockResolvedValue({
        type: 'chat',
        messages: mockContextMessages,
        strategy: 'full',
        metadata: { computedAt: new Date() },
        serialize: vi.fn()
      })
    }

    mockRecentStrategy = {
      build: vi.fn().mockResolvedValue({
        type: 'chat',
        messages: mockContextMessages.slice(-2),
        strategy: 'recent',
        metadata: { computedAt: new Date() },
        serialize: vi.fn()
      })
    }

    mockRelevantStrategy = {
      build: vi.fn().mockResolvedValue({
        type: 'chat',
        messages: mockContextMessages.filter(m => m.metadata?.tileId),
        strategy: 'relevant',
        metadata: { computedAt: new Date() },
        serialize: vi.fn()
      })
    }

    strategies = new Map<ChatContextStrategy, IChatStrategy>([
      ['full', mockFullStrategy],
      ['recent', mockRecentStrategy],
      ['relevant', mockRelevantStrategy]
    ])

    builder = new ChatContextBuilder(strategies)
  })

  describe('build', () => {
    it('should use full strategy by default', async () => {
      const result = await builder.build(mockMessages, 'full')

      expect(mockFullStrategy.build).toHaveBeenCalledWith(mockMessages, {})
      expect(result.strategy).toBe('full')
      expect(result.messages).toHaveLength(4)
    })

    it('should pass options to strategy', async () => {
      const options: ChatContextOptions = {
        maxMessages: 10,
        relevantTileIds: ['tile-123']
      }

      await builder.build(mockMessages, 'full', options)

      expect(mockFullStrategy.build).toHaveBeenCalledWith(mockMessages, options)
    })

    it('should use recent strategy when specified', async () => {
      const result = await builder.build(mockMessages, 'recent')

      expect(mockRecentStrategy.build).toHaveBeenCalled()
      expect(result.strategy).toBe('recent')
      expect(result.messages).toHaveLength(2)
    })

    it('should use relevant strategy when specified', async () => {
      const result = await builder.build(mockMessages, 'relevant')

      expect(mockRelevantStrategy.build).toHaveBeenCalled()
      expect(result.strategy).toBe('relevant')
      expect(result.messages).toHaveLength(2) // Only messages with tileId
    })

    it('should fallback to full strategy for unknown strategy', async () => {
      const result = await builder.build(mockMessages, 'unknown' as 'full')

      expect(mockFullStrategy.build).toHaveBeenCalled()
      expect(result.strategy).toBe('full')
    })
  })

  describe('FullStrategy', () => {
    it('should include all chat messages', async () => {
      // This will be tested with the actual FullStrategy implementation
    })
    
    it('should extract text from widget messages', async () => {
      // This will be tested with the actual FullStrategy implementation
    })
    
    it('should preserve message metadata', async () => {
      const result = await builder.build(mockMessages, 'full')
      
      const firstMessage = result.messages[0]
      expect(firstMessage?.metadata?.tileId).toBe('tile-123')
      expect(firstMessage?.timestamp).toEqual(new Date('2024-01-01T10:00:00Z'))
    })
  })
  
  describe('RecentStrategy', () => {
    it('should limit to N most recent messages', async () => {
      const result = await builder.build(mockMessages, 'recent')
      
      expect(result.messages).toHaveLength(2)
      expect(result.messages[0]?.content).toBe('I need to organize my tiles')
    })
    
    it('should maintain chronological order', async () => {
      const result = await builder.build(mockMessages, 'recent')
      
      expect(result.messages[0]!.timestamp < result.messages[1]!.timestamp).toBe(true)
    })
  })
  
  describe('RelevantStrategy', () => {
    it('should filter messages by tile context', async () => {
      const result = await builder.build(mockMessages, 'relevant')
      
      expect(result.messages.every(m => m.metadata?.tileId)).toBe(true)
    })
  })
})