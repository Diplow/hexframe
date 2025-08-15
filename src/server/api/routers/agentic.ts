import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { verificationAwareRateLimit, verificationAwareAuthLimit } from '../middleware/rate-limit'
import { createAgenticService } from '~/lib/domains/agentic/services'
import type { EventBus } from '~/app/map/Services/EventBus/event-bus'
import { EventBus as EventBusImpl } from '~/app/map/Services/EventBus/event-bus'
import type { CacheState } from '~/app/map/Cache/interface'
import type { ChatMessage } from '~/app/map/Chat/interface'
import type { CompositionConfig } from '~/lib/domains/agentic/types'
import { env } from '~/env'
import { db } from '~/server/db'
import { llmJobResults } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

// Message schema matching the Chat component
const chatMessageSchema = z.object({
  id: z.string(),
  type: z.enum(['user', 'assistant', 'system']),
  content: z.union([
    z.string(),
    z.object({
      type: z.enum(['preview', 'search', 'comparison', 'action', 'creation', 'login', 'confirm-delete', 'loading', 'error', 'ai-response']),
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
    .use(verificationAwareRateLimit) // Rate limit: 10 req/5min for verified, 3 req/5min for unverified
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
    .mutation(async ({ input, ctx }) => {
      // Create a server-side event bus instance
      const eventBus: EventBus = new EventBusImpl()
      
      // Determine if we should use queue based on environment
      const useQueue = process.env.USE_QUEUE === 'true' || process.env.NODE_ENV === 'production'
      
      console.log('[Agentic Router] Queue configuration:', {
        USE_QUEUE: process.env.USE_QUEUE,
        NODE_ENV: process.env.NODE_ENV,
        useQueue,
        model: input.model,
        userId: ctx.session?.userId ?? 'anonymous'
      })
      
      // Create agentic service with OpenRouter API key from environment
      const agenticService = createAgenticService({
        openRouterApiKey: env.OPENROUTER_API_KEY ?? '',
        eventBus,
        getCacheState: () => input.cacheState as CacheState,
        useQueue,
        userId: ctx.session?.userId ?? 'anonymous'
      })

      if (!agenticService.isConfigured()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'OpenRouter API key not configured. Please set OPENROUTER_API_KEY environment variable.',
        })
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
    .use(verificationAwareRateLimit) // Rate limit: 10 req/5min for verified, 3 req/5min for unverified
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
      // TODO: Implement streaming functionality
      // This will require:
      // 1. WebSocket or Server-Sent Events infrastructure
      // 2. Stream handling in the OpenRouter repository
      // 3. Progressive token emission to the client
      // For now, return a simple error since streaming requires different infrastructure
      throw new Error('Streaming not yet implemented. Use generateResponse for now.')
    }),

  getAvailableModels: protectedProcedure
    .use(verificationAwareAuthLimit) // Rate limit: 100 req/min for verified, 20 req/min for unverified
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
    }),

  // Get job status for polling
  getJobStatus: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input }) => {
      const result = await db.select()
        .from(llmJobResults)
        .where(eq(llmJobResults.jobId, input.jobId))
        .limit(1)
      
      if (!result[0]) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found'
        })
      }
      
      return {
        jobId: result[0].jobId,
        status: result[0].status,
        response: result[0].response,
        error: result[0].error,
        createdAt: result[0].createdAt,
        updatedAt: result[0].updatedAt
      }
    }),

  // Subscribe to job updates (using polling for simplicity)
  watchJobStatus: protectedProcedure
    .input(z.object({ 
      jobId: z.string(),
      pollInterval: z.number().min(1000).max(10000).default(2000)
    }))
    .subscription(async function* ({ input }) {
      let previousStatus = ''
      const maxAttempts = 300 // 10 minutes max with 2s intervals
      let attempts = 0
      
      while (attempts < maxAttempts) {
        const result = await db.select()
          .from(llmJobResults)
          .where(eq(llmJobResults.jobId, input.jobId))
          .limit(1)
        
        if (result[0]) {
          const currentStatus = result[0].status
          
          // Emit update if status changed or it's the first check
          if (currentStatus !== previousStatus) {
            yield {
              jobId: result[0].jobId,
              status: currentStatus,
              response: result[0].response,
              error: result[0].error,
              updatedAt: result[0].updatedAt
            }
            previousStatus = currentStatus
          }
          
          // Stop watching if job is complete
          if (currentStatus === 'completed' || currentStatus === 'failed' || currentStatus === 'cancelled') {
            break
          }
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, input.pollInterval))
        attempts++
      }
      
      // Timeout after max attempts
      if (attempts >= maxAttempts) {
        yield {
          jobId: input.jobId,
          status: 'timeout',
          error: 'Job polling timed out after 10 minutes',
          updatedAt: new Date()
        }
      }
    }),

  // Cancel a queued job
  cancelJob: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Check if job exists and belongs to user
      const job = await db.select()
        .from(llmJobResults)
        .where(eq(llmJobResults.jobId, input.jobId))
        .limit(1)
      
      if (!job[0]) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found'
        })
      }
      
      if (job[0].userId !== ctx.session?.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only cancel your own jobs'
        })
      }
      
      // Send cancel event to Inngest
      const { inngest } = await import('~/lib/domains/agentic/infrastructure/inngest/client')
      await inngest.send({
        name: 'llm/generate.cancel',
        data: { jobId: input.jobId }
      })
      
      return { success: true }
    })
})