/**
 * Two-phase template rendering.
 *
 * Phase 1 (Compile): Template + pool + tile structure → Structural template
 * Phase 2 (Render): Structural template + tile data → Final XML
 */

import Mustache from 'mustache'
import type { TileData } from '~/lib/domains/agentic/templates/_pre-processor'
import { buildPoolFromTemplateTile } from '~/lib/domains/agentic/templates/_pool'
import { compileTemplate } from '~/lib/domains/agentic/templates/_compiler/index'
import { buildMustacheData } from '~/lib/domains/agentic/templates/_compiler/_data-builder'

// ==================== PUBLIC TYPES ====================

export interface TwoPhaseRenderOptions {
  /** The root template tile with sub-templates as children */
  templateTile: TileData
  /** The task tile to render */
  taskTile: TileData
  /** Ancestors array (from root to parent) */
  ancestors?: TileData[]
  /** Name of the fallback template (default: 'generic') */
  fallbackTemplateName?: string
  /** Additional data to merge into Mustache context */
  additionalData?: Record<string, unknown>
}

export interface TwoPhaseRenderResult {
  /** The compiled structural template (inspectable) */
  compiledTemplate: string
  /** The final rendered output */
  rendered: string
}

// ==================== PUBLIC FUNCTIONS ====================

/**
 * Render a template using two-phase approach.
 *
 * @param options - Render options
 * @returns Both the compiled template and final rendered output
 */
export function twoPhaseRender(options: TwoPhaseRenderOptions): TwoPhaseRenderResult {
  const {
    templateTile,
    taskTile,
    ancestors = [],
    fallbackTemplateName = 'generic',
    additionalData = {}
  } = options

  // Build template pool from template's structural children
  const templatePool = buildPoolFromTemplateTile(templateTile, fallbackTemplateName)

  // Phase 1: Compile template
  const templateContent = templateTile.content ?? ''
  const compiledTemplate = compileTemplate(templateContent, taskTile, templatePool, ancestors)

  // Phase 2: Build data and render with Mustache
  // Pass templateTile to make its composed children accessible via template[-1], etc.
  const mustacheData = buildMustacheData(taskTile, ancestors, templateTile)
  const mergedData = { ...mustacheData, ...additionalData }
  const rendered = Mustache.render(compiledTemplate, mergedData)

  // Clean up excessive newlines
  const cleanedRendered = rendered
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n\n$/g, '')
    .trim()

  return {
    compiledTemplate,
    rendered: cleanedRendered
  }
}

/**
 * Compile a template without rendering (for inspection).
 *
 * @param templateTile - The template tile with sub-templates
 * @param taskTile - The task tile structure
 * @param fallbackTemplateName - Fallback template name
 * @param ancestors - Optional ancestors array
 * @returns The compiled structural template
 */
export function compileOnly(
  templateTile: TileData,
  taskTile: TileData,
  fallbackTemplateName = 'generic',
  ancestors: TileData[] = []
): string {
  const templatePool = buildPoolFromTemplateTile(templateTile, fallbackTemplateName)
  return compileTemplate(templateTile.content ?? '', taskTile, templatePool, ancestors)
}

/**
 * Check if a template uses pool-based rendering.
 *
 * @param templateContent - The template content
 * @returns True if the template contains {{@RenderChildren}} or {{@RenderAncestors}}
 */
export function usesPoolBasedRendering(templateContent: string): boolean {
  return templateContent.includes('{{@RenderChildren') || templateContent.includes('{{@RenderAncestors')
}
