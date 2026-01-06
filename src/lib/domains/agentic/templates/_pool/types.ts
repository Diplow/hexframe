/**
 * Template pool types for pool-based dispatch.
 *
 * A template pool is a collection of sub-templates that can be used
 * to render tile children based on itemType matching.
 */

import type { TileData } from '~/lib/domains/agentic/templates/_pre-processor'

// ==================== PUBLIC TYPES ====================

/**
 * A pooled template that can be used to render tiles.
 */
export interface PooledTemplate {
  /** The template name (used for itemType matching) */
  templateName: string
  /** The template content (Mustache + custom tags) */
  content: string
  /** Child templates for building next-level pool */
  children: TileData[]
}

/**
 * A collection of templates for rendering tile children.
 */
export interface TemplatePool {
  /** Map of templateName → template */
  templates: Map<string, PooledTemplate>
  /** Fallback template for unmatched itemTypes */
  fallback?: PooledTemplate
}
