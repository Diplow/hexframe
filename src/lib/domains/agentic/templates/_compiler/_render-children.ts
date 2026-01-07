/**
 * RenderChildren tag handler for template compilation.
 *
 * Expands {{@RenderChildren range=[-6..-1] fallback='generic'}} into
 * concrete template structure with proper variable prefixes.
 */

import type { TileData } from '~/lib/domains/agentic/templates/_pre-processor'
import { getChildrenInRange, resolveChildPath } from '~/lib/domains/agentic/templates/_pre-processor'
import type { ChildPath } from '~/lib/domains/agentic/templates/_pre-processor/_path-parser'
import { findTemplateForItemType, buildTemplatePool } from '~/lib/domains/agentic/templates/_pool'
import type { CompileContext } from '~/lib/domains/agentic/templates/_compiler/types'
import { prefixVariables } from '~/lib/domains/agentic/templates/_compiler/_variable-prefixer'

// ==================== PUBLIC FUNCTIONS ====================

/**
 * Expand a RenderChildren tag into compiled template structure.
 *
 * @param range - The direction range to iterate (e.g., { start: -6, end: -1 })
 * @param fallbackName - Name of fallback template
 * @param context - The compilation context
 * @param compileTemplate - Recursive compile function (to avoid circular imports)
 * @returns The expanded template string
 */
export function expandRenderChildren(
  range: { start: number; end: number },
  fallbackName: string | undefined,
  context: CompileContext,
  compileTemplate: (template: string, context: CompileContext) => string
): string {
  // Check recursion depth
  if (context.currentDepth >= context.maxDepth) {
    return '<!-- max depth reached -->'
  }

  // Get the current tile (either task or nested child)
  const currentTile = _getCurrentTile(context)
  if (!currentTile) {
    return ''
  }

  // Get children in the specified range
  const children = getChildrenInRange(currentTile, range.start, range.end)
  if (children.length === 0) {
    return ''
  }

  // Render each child using appropriate template from pool
  const renderedChildren = children.map(child => {
    return _renderChild(child, fallbackName, context, compileTemplate)
  })

  return renderedChildren.filter(Boolean).join('\n')
}

// ==================== INTERNAL FUNCTIONS ====================

/**
 * Get the current tile being rendered (following the current path).
 */
function _getCurrentTile(context: CompileContext): TileData | undefined {
  if (context.currentPath.length === 0) {
    return context.taskTile
  }

  const path: ChildPath = { directions: context.currentPath }
  return resolveChildPath(path, context.taskTile)
}

/**
 * Render a single child using the appropriate template from the pool.
 */
function _renderChild(
  child: TileData,
  fallbackName: string | undefined,
  context: CompileContext,
  compileTemplate: (template: string, context: CompileContext) => string
): string {
  // Find matching template in pool
  const itemTypeStr = child.itemType ? String(child.itemType) : undefined
  const template = findTemplateForItemType(context.templatePool, itemTypeStr)

  if (!template) {
    // No template found, skip this child
    return ''
  }

  // Build child path
  const childDirection = child.direction
  if (childDirection === undefined) {
    return ''
  }

  const childPath = [...context.currentPath, childDirection]

  // Build next-level pool from template's children
  const nextPool = buildTemplatePool(template.children, fallbackName)

  // Create child compilation context
  const childContext: CompileContext = {
    currentPath: childPath,
    taskTile: context.taskTile,
    ancestors: context.ancestors,
    templatePool: nextPool,
    maxDepth: context.maxDepth,
    currentDepth: context.currentDepth + 1
  }

  // Compile the sub-template recursively
  const compiledSubTemplate = compileTemplate(template.content, childContext)

  // Prefix variables with the child path
  return prefixVariables(compiledSubTemplate, childPath)
}
