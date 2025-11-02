import type { TileContextItem, CanvasContext, ChatContextMessage, ChatContext } from '~/lib/domains/agentic/types'
import type { MapContext } from '~/lib/domains/mapping/utils'
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
  composed: [],
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

export const createMockMapContext = (): MapContext => {
  return {
    center: {
      id: '1',
      ownerId: '1',
      coords: '1,0:1,2',
      title: 'Center Tile',
      content: 'This is the center tile content',
      preview: 'Preview of center tile',
      link: '',
      itemType: 'ITEM',
      depth: 2,
      parentId: null,
      originId: null
    },
    parent: {
      id: '0',
      ownerId: '1',
      coords: '1,0:',
      title: 'Parent Tile',
      content: 'This is the parent tile',
      preview: 'Preview of parent',
      link: '',
      itemType: 'USER',
      depth: 0,
      parentId: null,
      originId: null
    },
    composed: [],
    children: [
      {
        id: '2',
        ownerId: '1',
        coords: '1,0:1,2,1,3',
        title: 'Child Tile 1',
        content: 'Content of child tile 1',
        preview: 'Preview of child tile 1',
        link: '',
        itemType: 'ITEM',
        depth: 4,
        parentId: '1',
        originId: null
      },
      {
        id: '3',
        ownerId: '1',
        coords: '1,0:1,2,2,4',
        title: 'Child Tile 2',
        content: 'Content of child tile 2',
        preview: 'Preview of child tile 2',
        link: '',
        itemType: 'ITEM',
        depth: 4,
        parentId: '1',
        originId: null
      }
    ],
    grandchildren: [
      {
        id: '4',
        ownerId: '1',
        coords: '1,0:1,2,1,3,1,5',
        title: 'Grandchild Tile 1',
        content: 'Content of grandchild',
        preview: 'Preview of grandchild',
        link: '',
        itemType: 'ITEM',
        depth: 6,
        parentId: '2',
        originId: null
      }
    ]
  } as unknown as MapContext
}