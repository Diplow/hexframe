import type { ILLMRepository } from '~/lib/domains/agentic/repositories/llm.repository.interface'
import { PromptTemplateService } from '~/lib/domains/agentic/services/_templates'
import type { LLMGenerationParams } from '~/lib/domains/agentic/types'
import { env } from '~/env'

const MAX_PREVIEW_LENGTH = 250

export interface GeneratePreviewInput {
  title: string
  content: string
}

export interface GeneratePreviewResult {
  preview: string
  usedAI: boolean
}

export class PreviewGeneratorService {
  private promptTemplate: PromptTemplateService

  constructor(private readonly llmRepository: ILLMRepository) {
    this.promptTemplate = new PromptTemplateService()
  }

  async generatePreview(input: GeneratePreviewInput): Promise<GeneratePreviewResult> {
    const { title, content } = input

    // If content is already short enough, use it as-is
    if (content.length <= MAX_PREVIEW_LENGTH) {
      return {
        preview: content,
        usedAI: false
      }
    }

    // Otherwise, use AI to generate a concise preview
    if (!this.llmRepository.isConfigured()) {
      throw new Error('LLM repository is not configured')
    }

    const prompt = this.promptTemplate.renderTemplate('preview-generator', {
      CONTEXT: `Title: ${title}\n\nContent: ${content}`
    })

    const llmParams: LLMGenerationParams = {
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      model: env.GENERATE_PREVIEW_MODEL, // Use fast, cheap model for preview generation
      temperature: 0.3, // Low temperature for consistent, focused outputs
      maxTokens: 100, // ~250 chars = ~60-80 tokens, add buffer
      stream: false
    }

    const response = await this.llmRepository.generate(llmParams)

    return {
      preview: response.content.trim().substring(0, MAX_PREVIEW_LENGTH),
      usedAI: true
    }
  }
}
