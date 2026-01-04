/**
 * Templates Subsystem - Public API
 *
 * Generates execution-ready prompts from tile hierarchies using mustache templates.
 *
 * External API:
 * - buildPrompt(data: PromptData): string
 * - PromptData type
 * - HexrunOrchestratorTemplateData, OrchestratorPromptInput types (for orchestration prompts)
 * - shouldUseOrchestrator, buildOrchestratorPrompt functions
 */

export { buildPrompt, type PromptData } from '~/lib/domains/agentic/templates/_prompt-builder'
export {
  shouldUseOrchestrator,
  buildOrchestratorPrompt,
  type HexrunOrchestratorTemplateData,
  type OrchestratorPromptInput
} from '~/lib/domains/agentic/templates/_hexrun-orchestrator-template'
