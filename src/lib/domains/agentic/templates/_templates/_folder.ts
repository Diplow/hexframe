/**
 * Folder template.
 *
 * Recursively renders ORGANIZATIONAL tiles as nested folder structures.
 */

import { MapItemType } from '~/lib/domains/mapping'
import type { TileData } from '~/lib/domains/agentic/templates/_pre-processor'
import { GenericTile } from '~/lib/domains/agentic/templates/_templates/_generic-tile'

// ==================== INTERNAL UTILITIES ====================

function _escapeXML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// ==================== PUBLIC FUNCTIONS ====================

/**
 * Render an ORGANIZATIONAL tile as a folder with its children.
 *
 * @param tile - The organizational tile to render
 * @param fields - Fields to include for each child tile
 * @param depth - Maximum recursion depth (prevents infinite loops)
 * @returns Rendered XML folder structure
 *
 * @example
 * // Renders organizational tile with its children
 * Folder(orgTile, ['title', 'preview'], 3)
 * // => "<folder title=\"Projects\">\n<item>...</item>\n</folder>"
 */
export function Folder(
  tile: TileData | undefined,
  fields: string[],
  depth: number
): string {
  if (!tile) {
    return ''
  }

  // Depth limit reached - show collapsed folder
  if (depth <= 0) {
    return `<folder title="${_escapeXML(tile.title)}" collapsed="true" />`
  }

  const children = tile.children ?? []

  if (children.length === 0) {
    // Empty folder
    return `<folder title="${_escapeXML(tile.title)}" />`
  }

  // Render children
  const childrenXml = children
    .map(child => {
      if (child.itemType === MapItemType.ORGANIZATIONAL) {
        // Recursive: nested organizational tiles become nested folders
        return Folder(child, fields, depth - 1)
      }
      // Non-organizational children render as items with GenericTile
      const tileContent = GenericTile(child, fields)
      return tileContent ? `<item>\n${tileContent}\n</item>` : ''
    })
    .filter(xml => xml.length > 0)
    .join('\n')

  return `<folder title="${_escapeXML(tile.title)}">\n${childrenXml}\n</folder>`
}
