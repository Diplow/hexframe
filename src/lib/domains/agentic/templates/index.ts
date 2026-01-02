/**
 * Templates Subsystem - Public API
 *
 * Generates execution-ready prompts from tile hierarchies using mustache templates.
 *
 * External API:
 * - buildPrompt(data: PromptData): string
 * - PromptData type
 */

export { buildPrompt, type PromptData } from '~/lib/domains/agentic/templates/_prompt-builder'
