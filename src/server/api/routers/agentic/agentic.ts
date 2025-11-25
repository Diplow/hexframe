import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure, publicProcedure, mappingServiceMiddleware, iamServiceMiddleware } from '~/server/api/trpc'
import { verificationAwareRateLimit, verificationAwareAuthLimit } from '~/server/api/middleware'
import { createAgenticService, type CompositionConfig, PreviewGeneratorService, OpenRouterRepository, type ChatMessageContract } from '~/lib/domains/agentic'
import { ContextStrategies } from '~/lib/domains/mapping/utils'
import { EventBus as EventBusImpl } from '~/lib/utils/event-bus'
import { env } from '~/env'
import { db, schema } from '~/server/db'
const { llmJobResults } = schema
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import type { MappingService } from '~/lib/domains/mapping'

function getMapContextFromConfig(
  canvasStrategy: string | undefined,
  mappingService: MappingService,
  centerCoordId: string
) {
  const contextStrategy = canvasStrategy === 'minimal' ? ContextStrategies.MINIMAL :
                         canvasStrategy === 'extended' ? ContextStrategies.EXTENDED :
                         canvasStrategy === 'focused' ? ContextStrategies.FOCUSED :
                         ContextStrategies.STANDARD

  return mappingService.context.getContextForCenter(centerCoordId, contextStrategy)
}

// ChatMessage contract schema
const chatMessageSchema = z.object({
  id: z.string(),
  type: z.enum(['user', 'assistant', 'system']),
  content: z.string(), // Always string - widgets are pre-serialized by frontend
  metadata: z.object({
    timestamp: z.string().optional(), // ISO string
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


export const agenticRouter = createTRPCRouter({
  generateResponse: protectedProcedure
    .use(verificationAwareRateLimit) // Rate limit: 10 req/5min for verified, 3 req/5min for unverified
    .use(mappingServiceMiddleware) // Add mapping service to context
    .use(iamServiceMiddleware) // Add IAM service to context
    .input(
      z.object({
        centerCoordId: z.string(),
        messages: z.array(chatMessageSchema),
        model: z.string().default('claude-haiku-4-5-20251001'),
        temperature: z.number().min(0).max(2).optional(),
        maxTokens: z.number().min(1).max(8192).optional(),
        compositionConfig: compositionConfigSchema.optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Fetch map context using mapping domain service
      const mapContext = await getMapContextFromConfig(
        input.compositionConfig?.canvas?.strategy ?? 'standard',
        ctx.mappingService,
        input.centerCoordId
      )

      // Create a server-side event bus instance
      const eventBus = new EventBusImpl()

      // Determine if we should use queue based on environment
      const useQueue = process.env.USE_QUEUE === 'true' || process.env.NODE_ENV === 'production'

      // Get or create short-lived session MCP API key (10 min TTL for security)
      // This limits exposure if AI code steals the key - it expires after the session
      const { getOrCreateInternalApiKey } = await import('~/lib/domains/iam')
      const mcpApiKey = ctx.session?.userId
        ? await getOrCreateInternalApiKey(ctx.session.userId, 'mcp-session', 10)
        : undefined

      // Create agentic service with Claude SDK (preferred) or OpenRouter fallback
      const agenticService = createAgenticService({
        llmConfig: {
          openRouterApiKey: env.OPENROUTER_API_KEY ?? '',
          anthropicApiKey: env.ANTHROPIC_API_KEY ?? '',
          preferClaudeSDK: true, // Use Claude Agent SDK when anthropicApiKey is available
          useSandbox: env.USE_SANDBOX === 'true', // Use Vercel Sandbox in production
          mcpApiKey // Pass MCP key from IAM domain
        },
        eventBus,
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
      // MCP tools are provided by the HTTP MCP server at /api/mcp
      const response = await agenticService.generateResponse({
        mapContext,
        messages: input.messages as ChatMessageContract[],
        model: input.model,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
        compositionConfig: input.compositionConfig as CompositionConfig // Type mismatch due to zod schema limitations
      })

      // Handle queued responses differently
      const baseResponse = {
        id: response.id,
        content: response.content,
        model: response.model,
        usage: response.usage,
        finishReason: response.finishReason
      }

      // If this is a queued response, include the jobId
      if (response.finishReason === 'queued' && response.jobId) {
        return {
          ...baseResponse,
          jobId: response.jobId
        }
      }

      return baseResponse
    }),

  generateStreamingResponse: protectedProcedure
    .use(verificationAwareRateLimit) // Rate limit: 10 req/5min for verified, 3 req/5min for unverified
    .use(mappingServiceMiddleware) // Add mapping service to context
    .use(iamServiceMiddleware) // Add IAM service to context
    .input(
      z.object({
        centerCoordId: z.string(),
        messages: z.array(chatMessageSchema),
        model: z.string().default('claude-haiku-4-5-20251001'),
        temperature: z.number().min(0).max(2).optional(),
        maxTokens: z.number().min(1).max(8192).optional(),
        compositionConfig: compositionConfigSchema.optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Fetch map context using mapping domain service
      const mapContext = await getMapContextFromConfig(
        input.compositionConfig?.canvas?.strategy ?? 'standard',
        ctx.mappingService,
        input.centerCoordId
      )

      // Create a server-side event bus instance
      const eventBus = new EventBusImpl()

      // Get or create short-lived session MCP API key (10 min TTL for security)
      // This limits exposure if AI code steals the key - it expires after the session
      const { getOrCreateInternalApiKey } = await import('~/lib/domains/iam')
      const mcpApiKey = ctx.session?.userId
        ? await getOrCreateInternalApiKey(ctx.session.userId, 'mcp-session', 10)
        : undefined

      // Create agentic service with Claude SDK (preferred) or OpenRouter fallback
      const agenticService = createAgenticService({
        llmConfig: {
          openRouterApiKey: env.OPENROUTER_API_KEY ?? '',
          anthropicApiKey: env.ANTHROPIC_API_KEY ?? '',
          preferClaudeSDK: true, // Use Claude Agent SDK when anthropicApiKey is available
          useSandbox: env.USE_SANDBOX === 'true', // Use Vercel Sandbox in production
          mcpApiKey // Pass MCP key from IAM domain
        },
        eventBus,
        useQueue: false, // Streaming doesn't use queue
        userId: ctx.session?.userId ?? 'anonymous'
      })

      if (!agenticService.isConfigured()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'API key not configured. Please set OPENROUTER_API_KEY or ANTHROPIC_API_KEY environment variable.',
        })
      }

      // Handle SDK async generator for streaming
      const chunks: Array<{ content: string; isFinished: boolean }> = []

      // Generate streaming response
      // MCP tools are provided by the HTTP MCP server at /api/mcp
      const response = await agenticService.generateStreamingResponse(
        {
          mapContext,
          messages: input.messages as ChatMessageContract[],
          model: input.model,
          temperature: input.temperature,
          maxTokens: input.maxTokens,
          compositionConfig: input.compositionConfig as CompositionConfig
        },
        (chunk) => {
          chunks.push(chunk)
        }
      )

      // Return complete response with accumulated chunks
      return {
        id: response.id,
        content: response.content,
        model: response.model,
        usage: response.usage,
        finishReason: response.finishReason,
        chunks
      }
    }),

  getAvailableModels: protectedProcedure
    .use(verificationAwareAuthLimit) // Rate limit: 100 req/min for verified, 20 req/min for unverified
    .query(async () => {
      const eventBus = new EventBusImpl()

      const agenticService = createAgenticService({
        llmConfig: {
          openRouterApiKey: env.OPENROUTER_API_KEY ?? '',
          anthropicApiKey: env.ANTHROPIC_API_KEY ?? '',
          preferClaudeSDK: true, // Use Claude Agent SDK when anthropicApiKey is available
          useSandbox: env.USE_SANDBOX === 'true' // Use Vercel Sandbox in production
        },
        eventBus
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
    }),

  // Generate preview for tile content
  generatePreview: protectedProcedure
    .use(verificationAwareRateLimit) // Rate limit: 10 req/5min for verified, 3 req/5min for unverified
    .input(
      z.object({
        title: z.string(),
        content: z.string()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { title, content } = input

      // Quick return if content is already short enough
      const MAX_PREVIEW_LENGTH = 250
      if (content.length <= MAX_PREVIEW_LENGTH) {
        return {
          preview: content,
          usedAI: false
        }
      }

      // For longer content, use Inngest queue
      const useQueue = process.env.USE_QUEUE === 'true' || process.env.NODE_ENV === 'production'

      if (useQueue) {
        // Queue the job
        const jobId = `preview-${nanoid()}`
        const userId = ctx.session?.userId ?? 'anonymous'

        // Create pending job record
        await db.insert(llmJobResults).values({
          id: jobId,
          jobId,
          userId,
          status: 'pending',
          request: { title, content },
          createdAt: new Date(),
          updatedAt: new Date()
        })

        // Send to Inngest queue
        const { inngest } = await import('~/lib/domains/agentic/infrastructure/inngest/client')
        await inngest.send({
          name: 'preview/generate.request',
          data: {
            jobId,
            userId,
            title,
            content,
            timestamp: new Date().toISOString()
          }
        })

        return {
          preview: '',
          usedAI: true,
          jobId,
          queued: true
        }
      }

      // Direct generation (non-queued)
      const repository = new OpenRouterRepository(env.OPENROUTER_API_KEY ?? '')
      const previewService = new PreviewGeneratorService(repository)

      if (!repository.isConfigured()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'OpenRouter API key not configured. Please set OPENROUTER_API_KEY environment variable.',
        })
      }

      const result = await previewService.generatePreview({ title, content })

      return {
        preview: result.preview,
        usedAI: result.usedAI,
        queued: false
      }
    }),

  // Execute a task using its composed children for guidance
  hexecute: publicProcedure
    .use(mappingServiceMiddleware)
    .input(
      z.object({
        taskCoords: z.string(),
        instruction: z.string().optional()
      })
    )
    .query(async ({ input, ctx }) => {
      const { instruction, taskCoords } = input

      // Import utilities
      const { CoordSystem } = await import('~/lib/domains/mapping/utils')
      const { buildPrompt } = await import('~/lib/domains/agentic')

      // Parse coordinates
      let taskCoord
      try {
        taskCoord = CoordSystem.parseId(taskCoords)
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Invalid coordinate format: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }

      // Read task tile
      let taskTile
      try {
        taskTile = await ctx.mappingService.items.crud.getItem({
          coords: taskCoord
        })
      } catch (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Task tile not found at ${taskCoords}`,
          cause: error
        })
      }

      // Fetch composed children (-1 to -6)
      const { composed: composedChildren } = await ctx.mappingService.context.getContextForCenter(
        taskCoords,
        ContextStrategies.STANDARD
      )

      // Fetch structural children (1-6) for subtasks with coords
      const structuralChildren = []
      for (let dir = 1; dir <= 6; dir++) {
        try {
          const childCoords = { ...taskCoord, path: [...taskCoord.path, dir] }
          const child = await ctx.mappingService.items.crud.getItem({
            coords: childCoords
          })
          if (child) {
            structuralChildren.push({
              title: child.title,
              preview: child.preview ?? undefined,
              coords: CoordSystem.createId(childCoords)
            })
          }
        } catch {
          // Child doesn't exist, continue
        }
      }

      // Get MCP server name from environment (defaults to 'hexframe')
      const mcpServerName = process.env.HEXFRAME_MCP_SERVER ?? 'hexframe'

      // Fetch ancestor execution histories (from root to immediate parent)
      const ancestorHistories = []
      const ancestors = []

      // Build ancestor path from root to immediate parent
      for (let i = 0; i < taskCoord.path.length; i++) {
        const ancestorPath = taskCoord.path.slice(0, i)
        ancestors.push({
          userId: taskCoord.userId,
          groupId: taskCoord.groupId,
          path: ancestorPath
        })
      }

      // Fetch execution history (direction 0) for each ancestor
      for (const ancestorCoord of ancestors) {
        try {
          const historyCoord = { ...ancestorCoord, path: [...ancestorCoord.path, 0] }
          const historyTile = await ctx.mappingService.items.crud.getItem({
            coords: historyCoord
          })
          if (historyTile.content?.trim()) {
            ancestorHistories.push({
              coords: CoordSystem.createId(ancestorCoord),
              content: historyTile.content
            })
          }
        } catch {
          // Ancestor history doesn't exist, skip
        }
      }

      // Validate task tile has a non-empty title
      if (!taskTile.title || taskTile.title.trim().length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Task tile at ${taskCoords} has an empty title. A non-empty title is required for prompt generation.`
        })
      }

      // Build prompt using new recursive execution model
      let promptResult: string
      try {
        promptResult = buildPrompt({
          task: {
            title: taskTile.title,
            content: taskTile.content || undefined,
            coords: taskCoords
          },
          composedChildren: composedChildren.map(child => ({
            title: child.title,
            content: child.content
          })),
          structuralChildren,
          instruction,
          mcpServerName,
          ancestorHistories
        })
      } catch (error) {
        console.error(`Failed to build prompt for task at ${taskCoords}:`, error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to build prompt for task "${taskTile.title}" at ${taskCoords}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          cause: error
        })
      }

      return {
        prompt: promptResult
      }
    })
})