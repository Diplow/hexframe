import type { LLMGenerationParams, ModelInfo } from '~/lib/domains/agentic/types/llm.types'

export function extractSystemPrompt(
  messages: LLMGenerationParams['messages']
): string | undefined {
  const systemMessage = messages.find(m => m.role === 'system')
  return systemMessage?.content
}

export function buildPrompt(messages: LLMGenerationParams['messages']): string {
  // Filter out system messages and build conversation
  const conversationMessages = messages.filter(m => m.role !== 'system')

  if (conversationMessages.length === 0) {
    return ''
  }

  // If only user messages, return last one
  if (conversationMessages.every(m => m.role === 'user')) {
    return conversationMessages[conversationMessages.length - 1]?.content ?? ''
  }

  // Build multi-turn conversation
  return conversationMessages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n')
}

export function estimateUsage(
  messages: LLMGenerationParams['messages'],
  response: string
): { promptTokens: number; completionTokens: number; totalTokens: number } {
  // Rough estimation: ~4 characters per token
  const promptText = messages.map(m => m.content).join(' ')
  const promptTokens = Math.ceil(promptText.length / 4)
  const completionTokens = Math.ceil(response.length / 4)

  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens
  }
}

export function getClaudeModels(): ModelInfo[] {
  return [
    {
      id: 'claude-sonnet-4-5-20250929',
      name: 'Claude Sonnet 4.5',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutput: 8192,
      pricing: {
        prompt: 3.0,
        completion: 15.0
      }
    },
    {
      id: 'claude-opus-4-20250514',
      name: 'Claude Opus 4',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutput: 8192,
      pricing: {
        prompt: 15.0,
        completion: 75.0
      }
    },
    {
      id: 'claude-haiku-4-20250228',
      name: 'Claude Haiku 4',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutput: 8192,
      pricing: {
        prompt: 0.8,
        completion: 4.0
      }
    },
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutput: 8192,
      pricing: {
        prompt: 3.0,
        completion: 15.0
      }
    }
  ]
}
