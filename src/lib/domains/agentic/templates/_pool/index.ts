/**
 * Template pool module.
 *
 * Provides pool-based template dispatch for rendering tile children.
 */

export type { TemplatePool, PooledTemplate } from '~/lib/domains/agentic/templates/_pool/types'

export {
  buildTemplatePool,
  buildPoolFromTemplateTile,
  findTemplateForItemType
} from '~/lib/domains/agentic/templates/_pool/builder'
