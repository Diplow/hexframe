import { PROMPT_TEMPLATES, type PromptTemplateName, type PromptVariables } from '~/lib/domains/agentic/prompts/prompts.constants'

export class PromptTemplateService {
  renderTemplate(templateName: PromptTemplateName, variables: PromptVariables): string {
    try {
      const template = PROMPT_TEMPLATES[templateName]
      
      if (!template) {
        throw new Error(`Unknown prompt template: ${templateName}`)
      }

      return template(variables)
    } catch (error) {
      // Production-safe error handling
      if (process.env.NODE_ENV === 'production') {
        // Log the error for debugging but don't expose internal details
        console.error('Prompt template error:', error)
        
        // Return a basic fallback prompt
        return this.getFallbackPrompt(variables)
      } else {
        // Development: show detailed error
        const errorMessage = error instanceof Error ? error.message : String(error)
        throw new Error(`Failed to render prompt template '${templateName}': ${errorMessage}`)
      }
    }
  }

  private getFallbackPrompt(variables: PromptVariables): string {
    return `You are an AI assistant helping users work with Hexframe, a visual framework for building AI-powered systems through hierarchical hexagonal maps.

Current Context:
${variables.CONTEXT}

Instructions:
- Help users understand and work with their tile hierarchies
- Suggest improvements to their tile organization
- Answer questions about the current context
- Be concise and helpful
- Format responses using Markdown for better readability`
  }

  /**
   * @deprecated No longer needed with constant-based templates
   */
  clearCache(): void {
    // No-op: no cache needed with constants
  }
}