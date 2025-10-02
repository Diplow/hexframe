import type { Direction } from '~/lib/domains/mapping/utils'

export interface ContextMetadata {
  computedAt: Date
  tokenEstimate?: number
}

export type SerializationFormat = {
  type: 'structured' | 'narrative' | 'minimal' | 'xml'
  includeMetadata?: boolean
}

export interface Context {
  type: string
  metadata: ContextMetadata
  serialize(format: SerializationFormat): string
}

export interface TileContextItem {
  coordId: string
  title: string
  content: string
  position?: Direction
  depth: number
  hasChildren: boolean
}

export type CanvasContextStrategy = 
  | 'minimal'      // Just the center tile
  | 'standard'     // Center + 2 generations (default)
  | 'extended'     // Center + 3 generations
  | 'focused'      // Center + specific children
  | 'custom'       // Custom depth/filter configuration

export interface CanvasContext extends Context {
  type: 'canvas'
  center: TileContextItem
  children: TileContextItem[]
  grandchildren: TileContextItem[]
  strategy: CanvasContextStrategy
}

export interface ChatContextMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    tileId?: string
    model?: string
  }
}

export type ChatContextStrategy = 
  | 'full'         // Entire conversation history
  | 'recent'       // Last N messages
  | 'relevant'     // Only messages mentioning current tiles
  | 'summary'      // Summarized older messages + recent full

export interface ChatContext extends Context {
  type: 'chat'
  messages: ChatContextMessage[]
  strategy: ChatContextStrategy
}

export interface ContextComposition {
  strategy: 'sequential' | 'interleaved' | 'prioritized'
  tokenAllocation?: Record<string, number>
}

export interface ComposedContext extends Context {
  type: 'composed'
  contexts: Context[]
  composition: ContextComposition
}

export interface CanvasContextOptions {
  includeEmptyTiles?: boolean
  includeDescriptions?: boolean
  maxDepth?: number
  focusedPositions?: Direction[]
}

export interface ChatContextOptions {
  maxMessages?: number
  relevantTileIds?: string[]
  summaryThreshold?: number
}

export interface CompositionConfig {
  canvas?: {
    enabled: boolean
    strategy: CanvasContextStrategy
    options?: CanvasContextOptions
  }
  chat?: {
    enabled: boolean
    strategy: ChatContextStrategy
    options?: ChatContextOptions
  }
  composition?: {
    strategy: 'sequential' | 'interleaved' | 'prioritized'
    maxTotalTokens?: number
    tokenAllocation?: {
      canvas?: number
      chat?: number
    }
  }
}