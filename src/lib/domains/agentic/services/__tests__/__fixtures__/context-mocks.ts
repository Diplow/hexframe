import type { TileContextItem, CanvasContext, ChatContextMessage, ChatContext } from '~/lib/domains/agentic/types'
import { vi } from 'vitest'

export const createMockCenterTile = (): TileContextItem => ({
  coordId: 'user:123,group:456:1,2',
  title: 'Center Tile',
  content: 'Center description',
  depth: 0,
  hasChildren: true
})

export const createMockCanvasContext = (): CanvasContext => ({
  type: 'canvas',
  center: createMockCenterTile(),
  children: [
    { coordId: 'child1', title: 'Child 1', content: 'Desc 1', position: 1, depth: 1, hasChildren: false },
    { coordId: 'child2', title: 'Child 2', content: 'Desc 2', position: 2, depth: 1, hasChildren: false }
  ],
  grandchildren: [
    { coordId: 'gc1', title: 'GC 1', content: 'GC Desc 1', depth: 2, hasChildren: false }
  ],
  strategy: 'standard',
  metadata: { computedAt: new Date() },
  serialize: vi.fn().mockReturnValue('Canvas context serialized')
})

export const createMockChatMessages = (): ChatContextMessage[] => [
  {
    role: 'user',
    content: 'Hello',
    timestamp: new Date(),
    metadata: {}
  },
  {
    role: 'assistant',
    content: 'Hi there!',
    timestamp: new Date(),
    metadata: {}
  }
]

export const createMockChatContext = (): ChatContext => ({
  type: 'chat',
  messages: createMockChatMessages(),
  strategy: 'full',
  metadata: { computedAt: new Date() },
  serialize: vi.fn().mockReturnValue('Chat context serialized')
})