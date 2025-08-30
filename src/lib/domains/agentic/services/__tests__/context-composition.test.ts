import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ContextCompositionService } from '~/lib/domains/agentic/services/context-composition.service'
import type { CanvasContextBuilder } from '~/lib/domains/agentic/services/canvas-context-builder.service'
import type { ChatContextBuilder } from '~/lib/domains/agentic/services/chat-context-builder.service'
import type { TokenizerService } from '~/lib/domains/agentic/services/tokenizer.service'
import type { CompositionConfig } from '~/lib/domains/agentic/types'
import type { ChatMessage } from '~/app/map'
import { createMockCanvasContext, createMockChatContext } from '~/lib/domains/agentic/services/__tests__/__fixtures__/context-mocks'

describe('ContextCompositionService', () => {
  let mockCanvasBuilder: CanvasContextBuilder
  let mockChatBuilder: ChatContextBuilder
  let mockTokenizer: TokenizerService
  let service: ContextCompositionService

  const mockCanvasContext = createMockCanvasContext()
  const mockChatContext = createMockChatContext()

  beforeEach(() => {
    mockCanvasBuilder = {
      build: vi.fn().mockResolvedValue(mockCanvasContext)
    } as unknown as CanvasContextBuilder

    mockChatBuilder = {
      build: vi.fn().mockResolvedValue(mockChatContext)
    } as unknown as ChatContextBuilder

    mockTokenizer = {
      count: vi.fn().mockReturnValue(100)
    } as unknown as TokenizerService

    service = new ContextCompositionService(
      mockCanvasBuilder,
      mockChatBuilder,
      mockTokenizer
    )
  })

  it('should compose canvas and chat contexts sequentially', async () => {
    const config: CompositionConfig = {
      canvas: {
        enabled: true,
        strategy: 'standard'
      },
      chat: {
        enabled: true,
        strategy: 'full'
      }
    }

    const result = await service.composeContext(
      'user:123,group:456:1,2',
      [] as ChatMessage[],
      config
    )

    expect(result.type).toBe('composed')
    expect(result.contexts).toHaveLength(2)
    expect(result.contexts[0]?.type).toBe('canvas')
    expect(result.contexts[1]?.type).toBe('chat')
    expect(result.composition.strategy).toBe('sequential')
  })

  it('should respect token allocation between contexts', async () => {
    const config: CompositionConfig = {
      canvas: {
        enabled: true,
        strategy: 'standard'
      },
      chat: {
        enabled: true,
        strategy: 'full'
      },
      composition: {
        strategy: 'sequential',
        maxTotalTokens: 1000,
        tokenAllocation: {
          canvas: 400,
          chat: 600
        }
      }
    }

    mockTokenizer.count = vi.fn()
      .mockReturnValueOnce(500) // Canvas exceeds allocation
      .mockReturnValueOnce(700) // Chat exceeds allocation

    const result = await service.composeContext(
      'user:123,group:456:1,2',
      [] as ChatMessage[],
      config
    )

    expect(result.metadata.tokenEstimate).toBeDefined()
    expect(result.composition.tokenAllocation).toEqual({
      canvas: 400,
      chat: 600
    })
  })

  it('should handle single context type when other is disabled', async () => {
    const configCanvasOnly: CompositionConfig = {
      canvas: {
        enabled: true,
        strategy: 'standard'
      },
      chat: {
        enabled: false,
        strategy: 'full'
      }
    }

    const result = await service.composeContext(
      'user:123,group:456:1,2',
      [] as ChatMessage[],
      configCanvasOnly
    )

    expect(result.contexts).toHaveLength(1)
    expect(result.contexts[0]?.type).toBe('canvas')
  })

  it('should optimize context when exceeding token limits', async () => {
    const config: CompositionConfig = {
      canvas: {
        enabled: true,
        strategy: 'standard'
      },
      chat: {
        enabled: true,
        strategy: 'full'
      },
      composition: {
        strategy: 'sequential',
        maxTotalTokens: 150 // Very low limit to trigger optimization
      }
    }

    mockTokenizer.count = vi.fn().mockReturnValue(100) // Each context is 100 tokens

    const result = await service.composeContext(
      'user:123,group:456:1,2',
      [] as ChatMessage[],
      config
    )

    expect(result.contexts).toHaveLength(2)
    // Optimization logic would be tested here when implemented
  })

  describe('Token Optimization', () => {
    it('should prioritize recent chat messages when truncating', async () => {
      // This will be tested when token optimization is implemented
    })
    
    it('should preserve center tile even under extreme token pressure', async () => {
      // This will be tested when token optimization is implemented
    })
  })
})