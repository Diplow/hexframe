/**
 * TileOrFolder template dispatcher.
 *
 * Renders as Folder for ORGANIZATIONAL tiles, GenericTile for others.
 */

import { MapItemType } from '~/lib/domains/mapping'
import type { TileData } from '~/lib/domains/agentic/templates/_pre-processor'
import { GenericTile } from '~/lib/domains/agentic/templates/_templates/_generic-tile'
import { Folder } from '~/lib/domains/agentic/templates/_templates/_folder'

// ==================== PUBLIC FUNCTIONS ====================

/**
 * Dispatch tile rendering based on itemType.
 *
 * - ORGANIZATIONAL tiles render as recursive folders
 * - All other tiles render as generic tiles with wrapper
 *
 * @param tile - The tile to render
 * @param fields - Fields to include
 * @param wrapper - XML wrapper tag (used for non-organizational tiles)
 * @param depth - Recursion depth for folder rendering
 * @returns Rendered XML string
 */
export function TileOrFolder(
  tile: TileData | undefined,
  fields: string[],
  wrapper: string | undefined,
  depth: number
): string {
  if (!tile) {
    return ''
  }

  if (tile.itemType === MapItemType.ORGANIZATIONAL) {
    return Folder(tile, fields, depth)
  }

  return GenericTile(tile, fields, wrapper)
}
