import { z } from 'zod'
import type { CompositionConfig } from '~/lib/domains/agentic/types/context.types'

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