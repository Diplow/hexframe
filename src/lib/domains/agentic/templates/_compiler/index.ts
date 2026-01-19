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
import { expandRenderAncestors } from '~/lib/domains/agentic/templates/_compiler/_render-ancestors'

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
 * Pattern for RenderAncestors tags.
 * Matches: {{@RenderAncestors fallback='generic'}} or {{@RenderAncestors}}
 */
const RENDER_ANCESTORS_PATTERN = /\{\{@RenderAncestors(?:\s+([^}]*))?\}\}/g

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
 * - Expands {{@RenderChildren}} and {{@RenderAncestors}} tags based on tile structure
 * - Prefixes variables with child/ancestor paths
 * - Produces an inspectable structural template
 *
 * @param template - The template string to compile
 * @param taskTile - The task tile with full children tree
 * @param templatePool - The template pool for dispatch
 * @param ancestors - Optional ancestors array (from root to parent)
 * @returns The compiled structural template
 */
export function compileTemplate(
  template: string,
  taskTile: TileData,
  templatePool: TemplatePool,
  ancestors: TileData[] = []
): string {
  const context: CompileContext = {
    currentPath: [],
    taskTile,
    ancestors,
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
 * Internal compile function that processes RenderChildren and RenderAncestors tags.
 */
function _compileWithContext(template: string, context: CompileContext): string {
  // Find all tags of both types
  const childrenMatches = _findRenderChildrenTags(template)
  const ancestorMatches = _findRenderAncestorsTags(template)

  // Combine and sort by position (descending to preserve positions when replacing)
  const allMatches: Array<{ start: number; end: number; type: 'children' | 'ancestors'; data: unknown }> = [
    ...childrenMatches.map(m => ({ start: m.start, end: m.end, type: 'children' as const, data: m })),
    ...ancestorMatches.map(m => ({ start: m.start, end: m.end, type: 'ancestors' as const, data: m }))
  ].sort((a, b) => b.start - a.start)

  if (allMatches.length === 0) {
    return template
  }

  // Process tags in reverse order to preserve string positions
  let result = template
  for (const match of allMatches) {
    const expanded = match.type === 'children'
      ? _expandChildrenTag(match.data as ChildrenTagMatch, context)
      : _expandAncestorsTag(match.data as AncestorsTagMatch, context)
    result = result.slice(0, match.start) + expanded + result.slice(match.end)
  }

  return result
}

interface ChildrenTagMatch {
  start: number
  end: number
  range: { start: number; end: number }
  fallback?: string
}

interface AncestorsTagMatch {
  start: number
  end: number
  fallback?: string
}

/**
 * Find all RenderChildren tags in a template.
 */
function _findRenderChildrenTags(template: string): ChildrenTagMatch[] {
  const matches: ChildrenTagMatch[] = []

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
 * Find all RenderAncestors tags in a template.
 */
function _findRenderAncestorsTags(template: string): AncestorsTagMatch[] {
  const matches: AncestorsTagMatch[] = []

  RENDER_ANCESTORS_PATTERN.lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = RENDER_ANCESTORS_PATTERN.exec(template)) !== null) {
    const params = match[1] ?? ''

    // Parse optional fallback parameter
    const fallbackMatch = FALLBACK_PATTERN.exec(params)
    const fallback = fallbackMatch?.[1]

    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      fallback
    })
  }

  return matches
}

/**
 * Expand a single RenderChildren tag.
 */
function _expandChildrenTag(match: ChildrenTagMatch, context: CompileContext): string {
  return expandRenderChildren(
    match.range,
    match.fallback,
    context,
    _compileWithContext
  )
}

/**
 * Expand a single RenderAncestors tag.
 */
function _expandAncestorsTag(match: AncestorsTagMatch, context: CompileContext): string {
  return expandRenderAncestors(
    match.fallback,
    context,
    _compileWithContext
  )
}
