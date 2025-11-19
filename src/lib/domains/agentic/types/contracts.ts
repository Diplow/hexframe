import { z } from 'zod'
import type { CompositionConfig } from '~/lib/domains/agentic/types/context.types'

/**
 * ChatMessage - Shared contract between frontend and backend
 *
 * This represents a message in the chat conversation.
 * Frontend converts its internal ChatMessage type to this contract.
 * Backend uses this for AI context building.
 */
export interface ChatMessageContract {
  id: string
  type: 'system' | 'user' | 'assistant'
  content: string // Simplified - widgets are serialized to string
  metadata?: {
    tileId?: string
    timestamp?: string // ISO string for serialization
  }
}

/**
 * Tile snapshot for AI context with varying detail levels
 */
export interface TileSnapshot {
  coordId: string
  coordinates: {
    userId: string
    groupId: number
    path: number[]
  }
  title: string
  content?: string  // Full content for center, optional for children/grandchildren
  preview?: string  // Preview for children
}

/**
 * AIContextSnapshot - Snapshot of frontend cache state for AI context
 *
 * Hierarchical structure with varying detail levels:
 * - Center: full title + content + coordinates
 * - Composed (direction 0): title + content + preview + coordinates (up to 6 tiles inside center)
 * - Children: title + preview + coordinates
 * - Grandchildren: title + coordinates
 *
 * This decouples backend from frontend state structure.
 */
export interface AIContextSnapshot {
  centerCoordId: string | null
  center?: TileSnapshot  // Center tile with full content
  composed: TileSnapshot[]  // Composed tiles (direction 0) with full content + preview
  children: TileSnapshot[]  // Direct children with preview
  grandchildren: TileSnapshot[]  // Grandchildren with just title
  expandedTileIds: string[]
}

export const generateResponseInputSchema = z.object({
  message: z.string().min(1),
  centerCoordId: z.string(),
  model: z.string().default('openai/gpt-3.5-turbo'),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  contextConfig: z.custom<CompositionConfig>().optional()
})

export type GenerateResponseInput = z.infer<typeof generateResponseInputSchema>

export const generateResponseOutputSchema = z.object({
  response: z.string(),
  model: z.string(),
  usage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number()
  }),
  contextMetadata: z.object({
    tileCount: z.number(),
    messageCount: z.number(),
    tokenEstimate: z.number().optional()
  }).optional()
})

export type GenerateResponseOutput = z.infer<typeof generateResponseOutputSchema>

export const listModelsOutputSchema = z.array(z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string(),
  contextWindow: z.number(),
  maxOutput: z.number()
}))

export type ListModelsOutput = z.infer<typeof listModelsOutputSchema>