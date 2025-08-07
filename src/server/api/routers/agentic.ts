import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { createAgenticService } from '~/lib/domains/agentic/services'
import type { EventBus } from '~/app/map/Services/EventBus/event-bus'
import { EventBus as EventBusImpl } from '~/app/map/Services/EventBus/event-bus'
import type { CacheState } from '~/app/map/Cache/State/types'
import type { ChatMessage } from '~/app/map/Chat/types'
import type { CompositionConfig } from '~/lib/domains/agentic/types'
import { env } from '~/env'

// Message schema matching the Chat component
const chatMessageSchema = z.object({
  id: z.string(),
  type: z.enum(['user', 'assistant', 'system']),
  content: z.union([
    z.string(),
    z.object({
      type: z.enum(['preview', 'search', 'comparison', 'action', 'creation', 'login', 'confirm-delete', 'loading', 'error']),
      data: z.unknown()
    })
  ]),
  metadata: z.object({
    timestamp: z.date(),
    tileId: z.string().optional()
  }).optional()
})

// Composition config schema
const compositionConfigSchema = z.object({
  canvas: z.object({
    enabled: z.boolean(),
    strategy: z.enum(['standard', 'minimal', 'extended', 'focused', 'custom']),
    options: z.object({
      includeEmptyTiles: z.boolean().optional(),
      includeDescriptions: z.boolean().optional()
    }).optional()
  }).optional(),
  chat: z.object({
    enabled: z.boolean(),
    strategy: z.enum(['full', 'recent', 'relevant', 'summary']),
    options: z.object({
      maxMessages: z.number().optional(),
      relevantTileIds: z.array(z.string()).optional()
    }).optional()
  }).optional(),
  composition: z.object({
    strategy: z.enum(['sequential', 'interleaved', 'prioritized']),
    maxTotalTokens: z.number().optional(),
    tokenAllocation: z.object({
      canvas: z.number().optional(),
      chat: z.number().optional()
    }).optional()
  }).optional()
})

// Tile data schema for cache state
const tileDataSchema = z.object({
  metadata: z.object({
    coordId: z.string(),
    coordinates: z.object({
      userId: z.number(),
      groupId: z.number(),
      path: z.array(z.number())
    }),
    parentId: z.string().optional(),
    depth: z.number()
  }),
  data: z.object({
    name: z.string(),
    description: z.string(),
    url: z.string(),
    color: z.string()
  })
})

const cacheStateSchema = z.object({
  itemsById: z.record(z.string(), tileDataSchema),
  currentCenter: z.string()
})

export const agenticRouter = createTRPCRouter({
  generateResponse: protectedProcedure
    .input(
      z.object({
        centerCoordId: z.string(),
        messages: z.array(chatMessageSchema),
        model: z.string().default('deepseek/deepseek-r1-0528'),
        temperature: z.number().min(0).max(2).optional(),
        maxTokens: z.number().min(1).max(8192).optional(),
        compositionConfig: compositionConfigSchema.optional(),
        cacheState: cacheStateSchema
      })
    )
    .mutation(async ({ input }) => {
      // Create a server-side event bus instance
      const eventBus: EventBus = new EventBusImpl()
      
      // Create agentic service with OpenRouter API key from environment
      const agenticService = createAgenticService({
        openRouterApiKey: env.OPENROUTER_API_KEY ?? '',
        eventBus,
        getCacheState: () => input.cacheState as CacheState
      })

      if (!agenticService.isConfigured()) {
        throw new Error('OpenRouter API key not configured. Please set OPENROUTER_API_KEY environment variable.')
      }

      // Generate the response
      const response = await agenticService.generateResponse({
        centerCoordId: input.centerCoordId,
        messages: input.messages as ChatMessage[], // Type mismatch due to zod schema limitations
        model: input.model,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
        compositionConfig: input.compositionConfig as CompositionConfig // Type mismatch due to zod schema limitations
      })

      return {
        id: response.id,
        content: response.content,
        model: response.model,
        usage: response.usage,
        finishReason: response.finishReason
      }
    }),

  generateStreamingResponse: protectedProcedure
    .input(
      z.object({
        centerCoordId: z.string(),
        messages: z.array(chatMessageSchema),
        model: z.string().default('deepseek/deepseek-r1-0528'),
        temperature: z.number().min(0).max(2).optional(),
        maxTokens: z.number().min(1).max(8192).optional(),
        compositionConfig: compositionConfigSchema.optional(),
        cacheState: cacheStateSchema
      })
    )
    .mutation(async () => {
      // For now, return a simple error since streaming requires different infrastructure
      throw new Error('Streaming not yet implemented. Use generateResponse for now.')
    }),

  getAvailableModels: protectedProcedure
    .query(async () => {
      const eventBus: EventBus = new EventBusImpl()
      
      const agenticService = createAgenticService({
        openRouterApiKey: env.OPENROUTER_API_KEY ?? '',
        eventBus,
        getCacheState: () => {
          throw new Error('Cache state not needed for listing models')
        }
      })

      if (!agenticService.isConfigured()) {
        return []
      }

      const models = await agenticService.getAvailableModels()
      
      // Return a simplified model list for the client
      return models.map(model => ({
        id: model.id,
        name: model.name,
        provider: model.provider,
        contextWindow: model.contextWindow,
        maxOutput: model.maxOutput
      }))
    })
})