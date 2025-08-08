import type { TileContextItem, CanvasContext, ChatContextMessage, ChatContext } from '../../../types'
import { vi } from 'vitest'

export const createMockCenterTile = (): TileContextItem => ({
  coordId: 'user:123,group:456:1,2',
  name: 'Center Tile',
  description: 'Center description',
  depth: 0,
  hasChildren: true
})

export const createMockCanvasContext = (): CanvasContext => ({
  type: 'canvas',
  center: createMockCenterTile(),
  children: [
    { coordId: 'child1', name: 'Child 1', description: 'Desc 1', position: 1, depth: 1, hasChildren: false },
    { coordId: 'child2', name: 'Child 2', description: 'Desc 2', position: 2, depth: 1, hasChildren: false }
  ],
  grandchildren: [
    { coordId: 'gc1', name: 'GC 1', description: 'GC Desc 1', depth: 2, hasChildren: false }
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