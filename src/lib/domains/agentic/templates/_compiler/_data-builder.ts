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
 * - `ancestor[-1]` contains data for parent (closest ancestor)
 * - `ancestor[-2]` contains data for grandparent, etc.
 * - `template[-1]` contains data for template tile's composed child at -1
 *
 * @param taskTile - The root task tile with children
 * @param ancestors - Optional ancestors array (from root to parent)
 * @param templateTile - Optional template tile (for accessing template context children)
 * @returns A flat data object for Mustache rendering
 */
export function buildMustacheData(
  taskTile: TileData,
  ancestors: TileData[] = [],
  templateTile?: TileData
): MustacheData {
  const data: MustacheData = {
    task: {
      title: taskTile.title,
      content: taskTile.content ?? '',
      coords: taskTile.coords
    }
  }

  // Recursively flatten all children
  _flattenChildren(taskTile, [], data)

  // Flatten ancestors with negative indexing
  _flattenAncestors(ancestors, data)

  // Flatten template's composed children (if template tile provided)
  if (templateTile) {
    _flattenTemplateContext(templateTile, data)
  }

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

/**
 * Flatten ancestors into the data object using negative indexing.
 * ancestor[-1] = parent (closest), ancestor[-2] = grandparent, etc.
 */
function _flattenAncestors(ancestors: TileData[], data: MustacheData): void {
  if (!ancestors || ancestors.length === 0) {
    return
  }

  // ancestors[0] = root, ancestors[length-1] = parent
  // We use negative indexing: -1 = parent, -2 = grandparent
  for (let arrayIndex = 0; arrayIndex < ancestors.length; arrayIndex++) {
    const ancestor = ancestors[arrayIndex]!
    // Convert array index to negative index from current tile
    const negativeIndex = arrayIndex - ancestors.length
    const pathKey = `ancestor[${negativeIndex}]`

    data[pathKey] = {
      title: ancestor.title,
      content: ancestor.content ?? '',
      preview: ancestor.preview ?? '',
      coords: ancestor.coords,
      itemType: String(ancestor.itemType ?? '')
    }
  }
}

/**
 * Flatten template tile's composed children (directions -1 to -6).
 * Accessible via template[-1], template[-2], etc.
 */
function _flattenTemplateContext(templateTile: TileData, data: MustacheData): void {
  if (!templateTile.children) {
    return
  }

  // Filter to composed children only (negative directions)
  const composedChildren = templateTile.children.filter(
    child => child.direction !== undefined && child.direction < 0
  )

  for (const child of composedChildren) {
    const pathKey = `template[${child.direction}]`

    data[pathKey] = {
      title: child.title,
      content: child.content ?? '',
      preview: child.preview ?? '',
      coords: child.coords,
      itemType: String(child.itemType ?? '')
    }
  }
}
