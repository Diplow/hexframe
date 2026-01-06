/**
 * Data builder for Phase 2 (Mustache render).
 *
 * Builds a flat data object from tile tree where paths like
 * `child[-3].title` or `child[-2,-1].content` can be resolved.
 */

import type { TileData } from '~/lib/domains/agentic/templates/_pre-processor'
import type { PromptData, PromptDataTile } from '~/lib/domains/agentic/templates/_internals/types'

// ==================== PUBLIC TYPES ====================

/**
 * Flattened data object for Mustache rendering.
 * Keys are like: 'task', 'child[-3]', 'child[-3,-1]', etc.
 */
export interface MustacheData {
  task: {
    title: string
    content: string
    coords: string
  }
  [key: string]: {
    title: string
    content: string
    preview: string
    coords: string
    itemType: string
  } | MustacheData['task']
}

// ==================== PUBLIC FUNCTIONS ====================

/**
 * Convert PromptData to TileData with merged children and direction.
 *
 * Merges composedChildren and structuralChildren into a single children array
 * with direction field populated based on their original source.
 */
export function promptDataToTileData(data: PromptData): TileData {
  // Merge children with direction
  const children: TileData[] = []

  // Add composed children (negative directions)
  // We need to infer direction from the original data or coords
  for (const child of data.composedChildren) {
    children.push(_convertPromptDataTile(child))
  }

  // Add structural children (positive directions)
  for (const child of data.structuralChildren) {
    children.push(_convertPromptDataTile(child))
  }

  return {
    title: data.task.title,
    content: data.task.content,
    coords: data.task.coords,
    itemType: data.itemType,
    children: children.length > 0 ? children : undefined
  }
}

/**
 * Build Mustache data object from a tile tree.
 *
 * Flattens the tile hierarchy into a single object where:
 * - `task` contains the root tile data
 * - `child[-3]` contains data for child at direction -3
 * - `child[-3,-1]` contains data for nested child
 *
 * @param taskTile - The root task tile with children
 * @returns A flat data object for Mustache rendering
 */
export function buildMustacheData(taskTile: TileData): MustacheData {
  const data: MustacheData = {
    task: {
      title: taskTile.title,
      content: taskTile.content ?? '',
      coords: taskTile.coords
    }
  }

  // Recursively flatten all children
  _flattenChildren(taskTile, [], data)

  return data
}

/**
 * Extract direction from coords string.
 *
 * @param coords - Coords like "userId,groupId:1,2,-3"
 * @returns The last direction in the path, or undefined
 */
export function extractDirectionFromCoords(coords: string): number | undefined {
  const pathPart = coords.split(':')[1]
  if (!pathPart) {
    return undefined
  }

  const directions = pathPart.split(',').map(d => parseInt(d, 10))
  const lastDir = directions[directions.length - 1]

  if (lastDir === undefined || isNaN(lastDir)) {
    return undefined
  }

  return lastDir
}

// ==================== INTERNAL FUNCTIONS ====================

/**
 * Convert PromptDataTile to TileData, inferring direction from coords if needed.
 */
function _convertPromptDataTile(tile: PromptDataTile): TileData {
  // Get direction from tile or infer from coords
  const direction = tile.direction ?? extractDirectionFromCoords(tile.coords)

  const result: TileData = {
    title: tile.title,
    content: tile.content,
    preview: tile.preview,
    coords: tile.coords,
    itemType: tile.itemType,
    direction
  }

  // Recursively convert children
  if (tile.children && tile.children.length > 0) {
    result.children = tile.children.map(_convertPromptDataTile)
  }

  return result
}

/**
 * Recursively flatten children into the data object.
 */
function _flattenChildren(
  tile: TileData,
  currentPath: number[],
  data: MustacheData
): void {
  if (!tile.children) {
    return
  }

  for (const child of tile.children) {
    if (child.direction === undefined) {
      continue
    }

    const childPath = [...currentPath, child.direction]
    const pathKey = `child[${childPath.join(',')}]`

    // Add child data to the flat object
    data[pathKey] = {
      title: child.title,
      content: child.content ?? '',
      preview: child.preview ?? '',
      coords: child.coords,
      itemType: String(child.itemType ?? '')
    }

    // Recursively process grandchildren
    _flattenChildren(child, childPath, data)
  }
}
