/**
 * Template Services for Agentic Domain
 *
 * Consolidates template-related services for:
 * - Prompt template rendering (PromptTemplateService)
 * - Template resolution from database (TemplateResolverService)
 * - User template allowlist validation (TemplateAllowlistService)
 */

export { PromptTemplateService } from '~/lib/domains/agentic/services/_templates/prompt-template.service'

export {
  TemplateResolverService,
  TemplateNotFoundError
} from '~/lib/domains/agentic/services/_templates/template-resolver.service'
export type {
  TemplateData,
  TemplateWithChildren,
  TemplateRepository
} from '~/lib/domains/agentic/services/_templates/template-resolver.service'

export {
  TemplateAllowlistService,
  TemplateNotAllowedError,
  TemplateVisibilityError,
  BUILT_IN_TEMPLATES
} from '~/lib/domains/agentic/services/_templates/template-allowlist.service'
export type {
  Visibility,
  UserAllowlist,
  TemplateAllowlistRepository
} from '~/lib/domains/agentic/services/_templates/template-allowlist.service'
