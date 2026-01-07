/**
 * RenderAncestors tag handler for template compilation.
 *
 * Expands {{@RenderAncestors fallback='generic'}} into
 * concrete template structure with proper variable prefixes.
 *
 * Ancestor indexing uses negative numbers from current tile:
 * - ancestor[-1] = parent (closest)
 * - ancestor[-2] = grandparent
 * - ancestor[-N] = N levels up
 */

import type { TileData } from '~/lib/domains/agentic/templates/_pre-processor'
import { findTemplateForItemType } from '~/lib/domains/agentic/templates/_pool'
import type { CompileContext } from '~/lib/domains/agentic/templates/_compiler/types'
import { prefixAncestorVariables } from '~/lib/domains/agentic/templates/_compiler/_variable-prefixer'

// ==================== PUBLIC FUNCTIONS ====================

/**
 * Expand a RenderAncestors tag into compiled template structure.
 *
 * @param fallbackName - Name of fallback template
 * @param context - The compilation context (must include ancestors array)
 * @param compileTemplate - Recursive compile function (to avoid circular imports)
 * @returns The expanded template string
 */
export function expandRenderAncestors(
  fallbackName: string | undefined,
  context: CompileContext,
  compileTemplate: (template: string, context: CompileContext) => string
): string {
  const { ancestors } = context

  if (!ancestors || ancestors.length === 0) {
    return ''
  }

  // Render each ancestor using appropriate template from pool
  // ancestors[0] = root, ancestors[ancestors.length-1] = parent
  // We use negative indexing: -1 = parent, -2 = grandparent, etc.
  const renderedAncestors = ancestors.map((ancestor, arrayIndex) => {
    // Convert array index to negative index from current tile
    // arrayIndex 0 (root) when ancestors.length=3 → -3
    // arrayIndex 2 (parent) when ancestors.length=3 → -1
    const negativeIndex = arrayIndex - ancestors.length
    return _renderAncestor(ancestor, negativeIndex, fallbackName, context, compileTemplate)
  })

  return renderedAncestors.filter(Boolean).join('\n')
}

// ==================== INTERNAL FUNCTIONS ====================

/**
 * Render a single ancestor using the appropriate template from the pool.
 */
function _renderAncestor(
  ancestor: TileData,
  negativeIndex: number,
  fallbackName: string | undefined,
  context: CompileContext,
  compileTemplate: (template: string, context: CompileContext) => string
): string {
  // Find matching template in pool
  const itemTypeStr = ancestor.itemType ? String(ancestor.itemType) : undefined
  const template = findTemplateForItemType(context.templatePool, itemTypeStr)
    ?? (fallbackName ? findTemplateForItemType(context.templatePool, fallbackName) : undefined)

  if (!template) {
    // No template found, skip this ancestor
    return ''
  }

  // Compile the sub-template (no recursion for ancestors - they're flat)
  const compiledSubTemplate = compileTemplate(template.content, context)

  // Prefix variables with the ancestor index
  return prefixAncestorVariables(compiledSubTemplate, negativeIndex)
}
