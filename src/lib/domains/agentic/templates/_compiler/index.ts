/**
 * Template compiler module.
 *
 * Phase 1 of two-phase rendering: compiles templates with pool dispatch
 * into structural templates with variable placeholders.
 */

import type { TileData } from '~/lib/domains/agentic/templates/_pre-processor'
import type { TemplatePool } from '~/lib/domains/agentic/templates/_pool'
import type { CompileContext } from '~/lib/domains/agentic/templates/_compiler/types'
import { expandRenderChildren } from '~/lib/domains/agentic/templates/_compiler/_render-children'

export type { CompileContext, CompileResult } from '~/lib/domains/agentic/templates/_compiler/types'
export { prefixVariables, formatPath, formatPathWithField } from '~/lib/domains/agentic/templates/_compiler/_variable-prefixer'
export {
  buildMustacheData,
  promptDataToTileData,
  extractDirectionFromCoords,
  type MustacheData
} from '~/lib/domains/agentic/templates/_compiler/_data-builder'

export {
  twoPhaseRender,
  compileOnly,
  usesPoolBasedRendering,
  type TwoPhaseRenderOptions,
  type TwoPhaseRenderResult
} from '~/lib/domains/agentic/templates/_compiler/_two-phase-render'

// ==================== INTERNAL CONSTANTS ====================

/**
 * Pattern for RenderChildren tags.
 * Matches: {{@RenderChildren range=[-6..-1] fallback='generic'}}
 */
const RENDER_CHILDREN_PATTERN = /\{\{@RenderChildren\s+([^}]+)\}\}/g

/**
 * Pattern for parsing range parameter.
 */
const RANGE_PATTERN = /range=\[(-?\d+)\.\.(-?\d+)\]/

/**
 * Pattern for parsing fallback parameter.
 */
const FALLBACK_PATTERN = /fallback='([^']+)'/

// ==================== PUBLIC FUNCTIONS ====================

/**
 * Compile a template with pool-based dispatch.
 *
 * This is Phase 1 of two-phase rendering:
 * - Expands {{@RenderChildren}} tags based on tile structure
 * - Prefixes variables with child paths
 * - Produces an inspectable structural template
 *
 * @param template - The template string to compile
 * @param taskTile - The task tile with full children tree
 * @param templatePool - The template pool for dispatch
 * @returns The compiled structural template
 */
export function compileTemplate(
  template: string,
  taskTile: TileData,
  templatePool: TemplatePool
): string {
  const context: CompileContext = {
    currentPath: [],
    taskTile,
    templatePool,
    maxDepth: 10,
    currentDepth: 0
  }

  return _compileWithContext(template, context)
}

/**
 * Compile a template with an existing context.
 *
 * @param template - The template string to compile
 * @param context - The compilation context
 * @returns The compiled template
 */
export function compileWithContext(
  template: string,
  context: CompileContext
): string {
  return _compileWithContext(template, context)
}

// ==================== INTERNAL FUNCTIONS ====================

/**
 * Internal compile function that processes RenderChildren tags.
 */
function _compileWithContext(template: string, context: CompileContext): string {
  // Find all RenderChildren tags
  const matches = _findRenderChildrenTags(template)

  if (matches.length === 0) {
    return template
  }

  // Process tags in reverse order to preserve string positions
  let result = template
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i]!
    const expanded = _expandTag(match, context)
    result = result.slice(0, match.start) + expanded + result.slice(match.end)
  }

  return result
}

interface TagMatch {
  start: number
  end: number
  range: { start: number; end: number }
  fallback?: string
}

/**
 * Find all RenderChildren tags in a template.
 */
function _findRenderChildrenTags(template: string): TagMatch[] {
  const matches: TagMatch[] = []

  RENDER_CHILDREN_PATTERN.lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = RENDER_CHILDREN_PATTERN.exec(template)) !== null) {
    const params = match[1]!

    // Parse range parameter
    const rangeMatch = RANGE_PATTERN.exec(params)
    if (!rangeMatch) {
      continue
    }

    const range = {
      start: parseInt(rangeMatch[1]!, 10),
      end: parseInt(rangeMatch[2]!, 10)
    }

    // Parse optional fallback parameter
    const fallbackMatch = FALLBACK_PATTERN.exec(params)
    const fallback = fallbackMatch?.[1]

    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      range,
      fallback
    })
  }

  return matches
}

/**
 * Expand a single RenderChildren tag.
 */
function _expandTag(match: TagMatch, context: CompileContext): string {
  return expandRenderChildren(
    match.range,
    match.fallback,
    context,
    _compileWithContext
  )
}
