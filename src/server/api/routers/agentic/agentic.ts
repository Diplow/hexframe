import { z } from 'zod'
import { createTRPCRouter, protectedProcedure, publicProcedure, mappingServiceMiddleware, agenticServiceMiddleware } from '~/server/api/trpc'
import { verificationAwareRateLimit, verificationAwareAuthLimit } from '~/server/api/middleware'
import { createAgenticService, type CompositionConfig, PreviewGeneratorService, OpenRouterRepository, type ChatMessageContract } from '~/lib/domains/agentic'
import { buildPrompt } from '~/lib/domains/agentic/utils'
import { ContextStrategies } from '~/lib/domains/mapping/utils'
import { _getRequesterUserId } from '~/server/api/routers/map'
import { _requireConfigured, _requireFound, _requireOwnership, _throwBadRequest, _throwInternalError } from '~/server/api/routers/_error-helpers'
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
  // This procedure needs dynamic useQueue, so it creates its own service using ctx.eventBus and ctx.mcpApiKey
  generateResponse: protectedProcedure
    .use(verificationAwareRateLimit) // Rate limit: 10 req/5min for verified, 3 req/5min for unverified
    .use(mappingServiceMiddleware) // Add mapping service to context
    .use(agenticServiceMiddleware) // Provides eventBus and mcpApiKey
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

      // Determine if we should use queue based on environment
      const useQueue = process.env.USE_QUEUE === 'true' || process.env.NODE_ENV === 'production'

      // Create agentic service with dynamic useQueue (uses eventBus and mcpApiKey from middleware)
      const agenticService = createAgenticService({
        llmConfig: {
          openRouterApiKey: env.OPENROUTER_API_KEY ?? '',
          anthropicApiKey: env.ANTHROPIC_API_KEY ?? '',
          preferClaudeSDK: true,
          useSandbox: env.USE_SANDBOX === 'true',
          mcpApiKey: ctx.mcpApiKey
        },
        eventBus: ctx.eventBus,
        useQueue,
        userId: ctx.session?.userId ?? 'anonymous'
      })

      _requireConfigured(agenticService.isConfigured(), "OPENROUTER_API_KEY");

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
    .use(agenticServiceMiddleware) // Add agentic service to context
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

      _requireConfigured(ctx.agenticService.isConfigured(), "OPENROUTER_API_KEY or ANTHROPIC_API_KEY");

      // Handle SDK async generator for streaming
      const chunks: Array<{ content: string; isFinished: boolean }> = []

      // Generate streaming response
      // MCP tools are provided by the HTTP MCP server at /api/mcp
      const response = await ctx.agenticService.generateStreamingResponse(
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
    .use(agenticServiceMiddleware) // Add agentic service to context
    .query(async ({ ctx }) => {
      if (!ctx.agenticService.isConfigured()) {
        return []
      }

      const models = await ctx.agenticService.getAvailableModels()

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
      
      _requireFound(result[0], "Job");

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

      _requireFound(job[0], "Job");
      _requireOwnership(job[0].userId ?? "", ctx.session?.userId ?? "", "cancel jobs");

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

      _requireConfigured(repository.isConfigured(), "OPENROUTER_API_KEY");

      const result = await previewService.generatePreview({ title, content })

      return {
        preview: result.preview,
        usedAI: result.usedAI,
        queued: false
      }
    }),

  // Execute a task by combining hexecute prompt generation with Claude streaming response
  // This endpoint enables conversation continuation with follow-up messages
  executeTask: protectedProcedure
    .use(verificationAwareRateLimit)
    .use(mappingServiceMiddleware)
    .use(agenticServiceMiddleware) // Add agentic service to context
    .input(
      z.object({
        taskCoords: z.string(),
        instruction: z.string().optional(),
        messages: z.array(chatMessageSchema).optional(),
        model: z.string().default('claude-haiku-4-5-20251001'),
        temperature: z.number().min(0).max(2).optional(),
        maxTokens: z.number().min(1).max(8192).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { taskCoords, instruction, messages, model, temperature, maxTokens } = input
      const requester = _getRequesterUserId(ctx.user)

      // 1. Get all data from mapping service (single optimized query)
      const hexecuteContext = await ctx.mappingService.context.getHexecuteContext(
        taskCoords,
        requester
      )

      // 2. Validate task tile has a non-empty title
      if (!hexecuteContext.task.title?.trim())
        _throwBadRequest(`Task tile at ${taskCoords} has an empty title. A non-empty title is required for prompt generation.`);

      // Get MCP server name from environment (defaults to 'hexframe')
      const mcpServerName = process.env.HEXFRAME_MCP_SERVER ?? 'hexframe'

      // 3. Build the hexecute prompt (pure function, no I/O)
      let hexecutePrompt: string
      try {
        hexecutePrompt = buildPrompt({
          task: {
            title: hexecuteContext.task.title,
            content: hexecuteContext.task.content || undefined,
            coords: taskCoords
          },
          composedChildren: hexecuteContext.composedChildren.map(child => ({
            title: child.title,
            content: child.content,
            coords: child.coords
          })),
          structuralChildren: hexecuteContext.structuralChildren,
          instruction,
          mcpServerName,
          hexPlan: hexecuteContext.hexPlan,
          hexPlanInitializerPath: undefined
        })
      } catch (error) {
        console.error(`Failed to build prompt for task at ${taskCoords}:`, error)
        _throwInternalError(`Failed to build prompt for task "${hexecuteContext.task.title}" at ${taskCoords}: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
      }

      // Reference the task tile for building minimal map context
      const taskTile = hexecuteContext.task

      // Build messages array with hexecute prompt as the user message
      // The Claude Agent SDK uses the default Claude Code system prompt,
      // so we pass the hexecute context as the user's prompt (instruction is already embedded in it)
      const hexecuteUserMessage: ChatMessageContract = {
        id: `user-${nanoid()}`,
        type: 'user',
        content: hexecutePrompt
      }
      const conversationMessages: ChatMessageContract[] = [
        hexecuteUserMessage,
        ...(messages ?? []).map(msg => ({
          id: msg.id,
          type: msg.type,
          content: msg.content,
          metadata: msg.metadata
        }) as ChatMessageContract)
      ]

      _requireConfigured(ctx.agenticService.isConfigured(), "OPENROUTER_API_KEY or ANTHROPIC_API_KEY");

      // Handle SDK async generator for streaming
      const chunks: Array<{ content: string; isFinished: boolean }> = []

      // Build a minimal mapContext using the task tile as center
      // The hexecute prompt is already in the user message, so we disable canvas context
      const minimalMapContext = {
        center: {
          id: taskTile.id,
          ownerId: taskTile.ownerId,
          coords: taskCoords,
          title: taskTile.title,
          content: taskTile.content ?? '',
          preview: taskTile.preview ?? undefined,
          link: taskTile.link ?? '',
          itemType: taskTile.itemType,
          visibility: taskTile.visibility,
          depth: taskTile.depth,
          parentId: taskTile.parentId ?? null,
          originId: taskTile.originId ?? null
        },
        parent: null,
        composed: [],
        children: [],
        grandchildren: []
      }

      // Disable canvas context since hexecute prompt already contains all task context
      // This prevents double context injection
      const compositionConfigForTask: CompositionConfig = {
        canvas: { enabled: false, strategy: 'minimal' },
        chat: { enabled: true, strategy: 'full' },
        composition: { strategy: 'sequential' }
      }

      // Generate streaming response using the hexecute prompt as context
      const response = await ctx.agenticService.generateStreamingResponse(
        {
          mapContext: minimalMapContext,
          messages: conversationMessages,
          model,
          temperature,
          maxTokens,
          compositionConfig: compositionConfigForTask
        },
        (chunk) => {
          chunks.push(chunk)
        }
      )

      return {
        id: response.id,
        content: response.content,
        model: response.model,
        usage: response.usage,
        finishReason: response.finishReason,
        chunks,
        hexecutePrompt // Include the generated prompt for debugging/transparency
      }
    }),

  // Execute a task using its composed children for guidance
  hexecute: publicProcedure
    .use(mappingServiceMiddleware)
    .input(
      z.object({
        taskCoords: z.string(),
        instruction: z.string().optional(),
        hexPlanInitializerPath: z.string().optional() // Custom path for hexPlan initialization (e.g., '1,4')
      })
    )
    .query(async ({ input, ctx }) => {
      const { instruction, taskCoords, hexPlanInitializerPath } = input
      const requester = _getRequesterUserId(ctx.user)

      // 1. Get all data from mapping service (single optimized query)
      const hexecuteContext = await ctx.mappingService.context.getHexecuteContext(
        taskCoords,
        requester
      )

      // 2. Validate task tile has a non-empty title
      if (!hexecuteContext.task.title?.trim())
        _throwBadRequest(`Task tile at ${taskCoords} has an empty title. A non-empty title is required for prompt generation.`);

      // Get MCP server name from environment (defaults to 'hexframe')
      const mcpServerName = process.env.HEXFRAME_MCP_SERVER ?? 'hexframe'

      // 3. Build prompt (pure function, no I/O)
      let promptResult: string
      try {
        promptResult = buildPrompt({
          task: {
            title: hexecuteContext.task.title,
            content: hexecuteContext.task.content || undefined,
            coords: taskCoords
          },
          composedChildren: hexecuteContext.composedChildren.map(child => ({
            title: child.title,
            content: child.content,
            coords: child.coords
          })),
          structuralChildren: hexecuteContext.structuralChildren,
          instruction,
          mcpServerName,
          hexPlan: hexecuteContext.hexPlan,
          hexPlanInitializerPath
        })
      } catch (error) {
        console.error(`Failed to build prompt for task at ${taskCoords}:`, error)
        _throwInternalError(`Failed to build prompt for task "${hexecuteContext.task.title}" at ${taskCoords}: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
      }

      return { prompt: promptResult }
    })
})