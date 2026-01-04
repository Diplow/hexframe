/**
 * Generic tile template.
 *
 * Renders tile data with configurable field selection.
 */

import type { TileData } from '~/lib/domains/agentic/templates/_pre-processor'

// ==================== PUBLIC TYPES ====================

export type TileField = 'title' | 'content' | 'preview' | 'coords'

// ==================== INTERNAL UTILITIES ====================

function _escapeXML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function _hasContent(text: string | undefined): boolean {
  return !!text && text.trim().length > 0
}

function _renderField(field: TileField, value: string): string {
  switch (field) {
    case 'title':
      // Title is used as an attribute in wrappers, render as text here
      return value
    case 'content':
      // Content is NOT escaped (preserved for LLM to see raw markdown/code)
      return value
    case 'preview':
      return value
    case 'coords':
      return value
    default: {
      const exhaustiveCheck: never = field
      throw new Error(`Unknown field: ${String(exhaustiveCheck)}`)
    }
  }
}

// ==================== PUBLIC FUNCTIONS ====================

/**
 * Render a tile with configurable fields.
 *
 * @param tile - The tile data to render
 * @param fields - Array of fields to include in output
 * @param wrapper - Optional XML tag to wrap the output
 * @returns Rendered XML string
 *
 * @example
 * // Basic usage
 * GenericTile(tile, ['title', 'content'])
 * // => "Task Title\nTask content here..."
 *
 * @example
 * // With wrapper
 * GenericTile(tile, ['title', 'content'], 'context')
 * // => "<context title=\"Task Title\" coords=\"userId,0:1\">\nTask content here...\n</context>"
 */
export function GenericTile(
  tile: TileData | undefined,
  fields: string[],
  wrapper?: string
): string {
  if (!tile) {
    return ''
  }

  const validFields = fields.filter((field): field is TileField =>
    ['title', 'content', 'preview', 'coords'].includes(field)
  )

  // Collect field values
  const parts: string[] = []
  for (const field of validFields) {
    const value = tile[field]
    if (!_hasContent(value)) continue

    // Title and coords go in attributes when wrapper is used
    if (wrapper && (field === 'title' || field === 'coords')) {
      continue
    }

    parts.push(_renderField(field, value!))
  }

  const content = parts.join('\n')

  if (!wrapper) {
    return content
  }

  // Build wrapper with title and coords as attributes
  const titleAttr = _hasContent(tile.title) ? ` title="${_escapeXML(tile.title)}"` : ''
  const coordsAttr = _hasContent(tile.coords) ? ` coords="${_escapeXML(tile.coords)}"` : ''

  if (!content) {
    return `<${wrapper}${titleAttr}${coordsAttr} />`
  }

  return `<${wrapper}${titleAttr}${coordsAttr}>\n${content}\n</${wrapper}>`
}
