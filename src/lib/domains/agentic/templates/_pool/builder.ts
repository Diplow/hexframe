/**
 * Template pool builder.
 *
 * Builds a TemplatePool from template tile children.
 */

import type { TileData } from '~/lib/domains/agentic/templates/_pre-processor'
import type { TemplatePool, PooledTemplate } from '~/lib/domains/agentic/templates/_pool/types'

// ==================== PUBLIC FUNCTIONS ====================

/**
 * Build a template pool from template tile children.
 *
 * @param templateChildren - Children of the template tile (structural children 1-6)
 * @param fallbackTemplateName - Optional name of fallback template (default: 'generic')
 * @returns A TemplatePool for rendering tile children
 */
export function buildTemplatePool(
  templateChildren: TileData[],
  fallbackTemplateName = 'generic'
): TemplatePool {
  const templates = new Map<string, PooledTemplate>()
  let fallback: PooledTemplate | undefined

  for (const child of templateChildren) {
    // Skip children without content (they're not templates)
    if (!child.content) {
      continue
    }

    // Get templateName from the tile (could be stored in a custom field or title)
    // For now, we use itemType as templateName since that's what we match against
    const templateName = _getTemplateName(child)
    if (!templateName) {
      continue
    }

    const pooledTemplate: PooledTemplate = {
      templateName,
      content: child.content,
      children: child.children ?? []
    }

    templates.set(templateName, pooledTemplate)

    // Track fallback template
    if (templateName === fallbackTemplateName) {
      fallback = pooledTemplate
    }
  }

  return { templates, fallback }
}

/**
 * Build a template pool from a template's structural children only.
 *
 * @param templateTile - The template tile with children
 * @param fallbackTemplateName - Optional name of fallback template
 * @returns A TemplatePool for rendering tile children
 */
export function buildPoolFromTemplateTile(
  templateTile: TileData,
  fallbackTemplateName = 'generic'
): TemplatePool {
  const structuralChildren = (templateTile.children ?? [])
    .filter(c => (c.direction ?? 0) > 0)

  return buildTemplatePool(structuralChildren, fallbackTemplateName)
}

/**
 * Find a template in the pool that matches a tile's itemType.
 *
 * @param pool - The template pool to search
 * @param itemType - The tile's itemType to match
 * @returns The matching template, fallback, or undefined
 */
export function findTemplateForItemType(
  pool: TemplatePool,
  itemType: string | undefined
): PooledTemplate | undefined {
  if (!itemType) {
    return pool.fallback
  }

  return pool.templates.get(itemType) ?? pool.fallback
}

// ==================== INTERNAL FUNCTIONS ====================

/**
 * Extract template name from a tile.
 *
 * Templates can specify their name via:
 * 1. A 'templateName' field (if extended TileData)
 * 2. The title (for template tiles, title IS the templateName)
 * 3. The itemType field (for non-template tiles)
 */
function _getTemplateName(tile: TileData): string | undefined {
  // Check for templateName in extended tile data
  const extendedTile = tile as TileData & { templateName?: string }
  if (extendedTile.templateName) {
    return extendedTile.templateName
  }

  // For template tiles, use title as templateName
  // (templates have itemType="template" but title indicates what they match)
  if (tile.itemType === 'template' && tile.title) {
    return tile.title.toLowerCase().replace(/\s+/g, '-')
  }

  // For non-template tiles, use itemType
  if (tile.itemType && tile.itemType !== 'template') {
    return String(tile.itemType)
  }

  // Last resort: derive from title
  if (tile.title) {
    return tile.title.toLowerCase().replace(/\s+/g, '-')
  }

  return undefined
}
