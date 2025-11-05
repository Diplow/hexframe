import { inngest } from '~/lib/domains/agentic/infrastructure'
import {
  OpenRouterRepository,
  ClaudeAgentSDKRepository,
  type ILLMRepository,
  type LLMGenerationParams,
  PreviewGeneratorService
} from '~/lib/domains/agentic'
import { db, schema } from '~/server/db'
const { llmJobResults } = schema
import { eq, sql } from 'drizzle-orm'
import { loggers } from '~/lib/debug/debug-logger'
import { env } from '~/env'

/**
 * Create the appropriate LLM repository based on environment configuration
 * Supports both OpenRouter and Claude Agent SDK
 */
function _createLLMRepository(): ILLMRepository {
  const provider = env.LLM_PROVIDER ?? 'openrouter'

  switch (provider) {
    case 'claude-agent-sdk':
      return new ClaudeAgentSDKRepository(env.ANTHROPIC_API_KEY ?? '')
    case 'openrouter':
    default:
      return new OpenRouterRepository(env.OPENROUTER_API_KEY ?? '')
  }
}

interface GenerateRequestData {
  jobId: string
  userId: string
  params: LLMGenerationParams
  estimatedTokens?: number
  timestamp: string
}

// Main LLM generation function with queuing and retries
export const generateLLMResponse = inngest.createFunction(
  {
    id: 'llm-generate',
    name: 'Generate LLM Response',
    throttle: {
      // Rate limit: 5 concurrent requests per user
      limit: 5,
      period: '1m',
      key: 'event.data.userId'
    },
    retries: 3,
    // Cancel if a cancel event is received
    cancelOn: [
      {
        event: 'llm/generate.cancel',
        match: 'data.jobId'
      }
    ]
  },
  { event: 'llm/generate.request' },
  async ({ event, step }) => {
    const eventData = event.data as GenerateRequestData
    const { jobId, userId, params } = eventData

    // Step 1: Update job status to processing
    await step.run('update-status-processing', async () => {
      loggers.agentic('Processing LLM job', { jobId, userId, model: params.model })

      // Update existing record from 'pending' to 'processing'
      // The record should already exist from when it was queued
      await db.insert(llmJobResults).values({
        id: jobId,
        jobId,
        userId,
        status: 'processing',
        request: params,
        createdAt: new Date(),
        updatedAt: new Date()
      }).onConflictDoUpdate({
        target: llmJobResults.jobId,
        set: {
          status: 'processing',
          updatedAt: new Date()
        }
      })
    })

    // Step 2: Call LLM repository with automatic retries
    // Supports both OpenRouter (fetch-based) and Claude Agent SDK (async generator)
    const response = await step.run('call-llm-repository', async () => {
      try {
        const repository = _createLLMRepository()

        loggers.agentic('Calling LLM repository', {
          jobId,
          model: params.model,
          provider: repository.isConfigured() ? 'configured' : 'not-configured',
          messageCount: params.messages.length
        })

        // Both OpenRouter and SDK repositories implement the same interface
        // OpenRouter uses fetch API with ReadableStream
        // SDK uses async generators - both patterns work in Inngest step.run()
        const llmResponse = await repository.generate(params)

        loggers.agentic('LLM response received', {
          jobId,
          provider: llmResponse.provider,
          usage: llmResponse.usage,
          finishReason: llmResponse.finishReason
        })

        return llmResponse
      } catch (error) {
        loggers.agentic.error('LLM call failed', {
          jobId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        throw error
      }
    })

    // Step 3: Store the successful result
    await step.run('store-result', async () => {
      await db.update(llmJobResults)
        .set({
          status: 'completed',
          response,
          updatedAt: new Date()
        })
        .where(eq(llmJobResults.jobId, jobId))
      
      loggers.agentic('Job completed successfully', { jobId })
    })

    // Step 4: Send webhook notification (if configured)
    await step.run('notify-webhook', async () => {
      // This could notify a webhook endpoint that the client is listening to
      // For now, we'll just log it
      loggers.agentic('Job completion notification', { jobId, userId })
      
      // In production, you might want to:
      // - Send a Server-Sent Event
      // - Trigger a WebSocket message
      // - Call a webhook URL
    })

    return { jobId, response }
  }
)

// Handle job cancellation
export const cancelLLMJob = inngest.createFunction(
  {
    id: 'llm-cancel',
    name: 'Cancel LLM Job'
  },
  { event: 'llm/generate.cancel' },
  async ({ event, step }) => {
    const { jobId } = event.data as { jobId: string }

    await step.run('mark-cancelled', async () => {
      await db.update(llmJobResults)
        .set({
          status: 'cancelled',
          updatedAt: new Date()
        })
        .where(eq(llmJobResults.jobId, jobId))
      
      loggers.agentic('Job cancelled', { jobId })
    })
  }
)

// Clean up old completed jobs (run daily)
export const cleanupOldJobs = inngest.createFunction(
  {
    id: 'llm-cleanup',
    name: 'Cleanup Old LLM Jobs'
  },
  { cron: '0 2 * * *' }, // Run at 2 AM daily
  async ({ step }) => {
    await step.run('delete-old-jobs', async () => {
      // Delete jobs older than 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      // Using less than operator for date comparison
      await db.delete(llmJobResults)
        .where(sql`${llmJobResults.createdAt} < ${sevenDaysAgo}`)

      loggers.agentic('Cleaned up old jobs older than 7 days')
    })
  }
)

interface GeneratePreviewRequestData {
  jobId: string
  userId: string
  title: string
  content: string
  timestamp: string
}

// Generate preview for tile content
export const generatePreview = inngest.createFunction(
  {
    id: 'preview-generate',
    name: 'Generate Tile Preview',
    throttle: {
      // Rate limit: 10 concurrent requests per user
      limit: 10,
      period: '1m',
      key: 'event.data.userId'
    },
    retries: 2
  },
  { event: 'preview/generate.request' },
  async ({ event, step }) => {
    const eventData = event.data as GeneratePreviewRequestData
    const { jobId, userId, title, content } = eventData

    // Step 1: Update job status to processing
    await step.run('update-status-processing', async () => {
      loggers.agentic('Processing preview generation job', { jobId, userId })

      await db.insert(llmJobResults).values({
        id: jobId,
        jobId,
        userId,
        status: 'processing',
        request: { title, content },
        createdAt: new Date(),
        updatedAt: new Date()
      }).onConflictDoUpdate({
        target: llmJobResults.jobId,
        set: {
          status: 'processing',
          updatedAt: new Date()
        }
      })
    })

    // Step 2: Generate preview
    const result = await step.run('generate-preview', async () => {
      try {
        const repository = _createLLMRepository()
        const previewService = new PreviewGeneratorService(repository)

        loggers.agentic('Generating preview', { jobId, titleLength: title.length, contentLength: content.length })

        const previewResult = await previewService.generatePreview({ title, content })

        loggers.agentic('Preview generated', {
          jobId,
          usedAI: previewResult.usedAI,
          previewLength: previewResult.preview.length
        })

        return previewResult
      } catch (error) {
        loggers.agentic.error('Preview generation failed', {
          jobId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        throw error
      }
    })

    // Step 3: Store the result
    await step.run('store-result', async () => {
      await db.update(llmJobResults)
        .set({
          status: 'completed',
          response: { preview: result.preview, usedAI: result.usedAI },
          updatedAt: new Date()
        })
        .where(eq(llmJobResults.jobId, jobId))

      loggers.agentic('Preview job completed successfully', { jobId })
    })

    return { jobId, result }
  }
)

// Export all functions for registration
export const inngestFunctions = [
  generateLLMResponse,
  cancelLLMJob,
  cleanupOldJobs,
  generatePreview
]