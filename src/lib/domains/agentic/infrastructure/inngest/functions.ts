import { inngest } from './client'
import { OpenRouterRepository } from '../../repositories/openrouter.repository'
import { db } from '~/server/db'
import { llmJobResults } from '~/server/db/schema'
import { eq, sql } from 'drizzle-orm'
import type { LLMGenerationParams } from '../../types/llm.types'
import { loggers } from '~/lib/debug/debug-logger'
import { env } from '~/env'

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

    // Step 2: Call OpenRouter with automatic retries
    const response = await step.run('call-openrouter', async () => {
      try {
        const repository = new OpenRouterRepository(env.OPENROUTER_API_KEY ?? '')
        
        loggers.agentic('Calling OpenRouter', { 
          jobId, 
          model: params.model,
          messageCount: params.messages.length 
        })
        
        const llmResponse = await repository.generate(params)
        
        loggers.agentic('OpenRouter response received', {
          jobId,
          usage: llmResponse.usage,
          finishReason: llmResponse.finishReason
        })
        
        return llmResponse
      } catch (error) {
        loggers.agentic.error('OpenRouter call failed', { 
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

// Export all functions for registration
export const inngestFunctions = [
  generateLLMResponse,
  cancelLLMJob,
  cleanupOldJobs
]