/**
 * Template context resolver.
 *
 * Resolves item references (., this, path.to.value) to actual data.
 */

import type { ItemTypeValue } from '~/lib/domains/mapping'
import { parseChildRef, type ChildPath } from '~/lib/domains/agentic/templates/_pre-processor/_path-parser'

// ==================== PUBLIC TYPES ====================

export interface TileData {
  title: string
  content?: string
  preview?: string
  coords: string
  itemType?: ItemTypeValue
  direction?: number  // -6 to 6, for child lookup by direction
  children?: TileData[]
}

export interface TemplateContext {
  /** Current item being iterated (for loop contexts) */
  currentItem?: TileData
  /** The main task tile */
  task: TileData
  /** Ancestors from root to parent */
  ancestors: TileData[]
  /** Composed children (context materials) */
  composedChildren: TileData[]
  /** Structural children (subtasks) */
  structuralChildren: TileData[]
  /** Hexplan content */
  hexPlan: string
  /** Hexplan coordinates */
  hexplanCoords: string
  /** MCP server name */
  mcpServerName: string
  /** Whether task has structural children */
  isParentTile: boolean
  /** Hexplan status */
  hexplanStatus: 'pending' | 'complete' | 'blocked'
}

// ==================== PUBLIC FUNCTIONS ====================

/**
 * Resolve an item reference to actual tile data.
 *
 * Supported references:
 * - `.` or `this` - current item in loop
 * - `task` - the main task tile
 * - `ancestors` - ancestor array
 * - `composedChildren` - composed children array
 * - `structuralChildren` - structural children array
 * - `child[-3]` - child at direction -3
 * - `child[-2,-1]` - nested child path
 * - Path expressions like `task.title`
 */
export function resolveItemReference(
  ref: string | undefined,
  context: TemplateContext
): TileData | undefined {
  if (!ref || ref === '.' || ref === 'this') {
    return context.currentItem
  }

  if (ref === 'task') {
    return context.task
  }

  // Handle child path references like child[-3] or child[-2,-1]
  const childRef = parseChildRef(ref)
  if (childRef?.type === 'path') {
    return resolveChildPath(childRef.path, context.task)
  }

  // Handle array access like ancestors[0]
  const arrayMatch = /^(\w+)\[(\d+)\]$/.exec(ref)
  if (arrayMatch) {
    const arrayName = arrayMatch[1] as keyof TemplateContext
    const index = parseInt(arrayMatch[2]!, 10)
    const array = context[arrayName]
    if (Array.isArray(array)) {
      return array[index] as TileData | undefined
    }
  }

  // Handle simple property access
  if (ref in context) {
    const value = context[ref as keyof TemplateContext]
    if (_isTileData(value)) {
      return value
    }
  }

  return undefined
}

/**
 * Resolve a child path to tile data.
 *
 * @param path - The parsed child path (e.g., { directions: [-2, -1] })
 * @param rootTile - The tile to start resolution from
 * @returns The tile at the path, or undefined if not found
 */
export function resolveChildPath(
  path: ChildPath,
  rootTile: TileData
): TileData | undefined {
  let current: TileData | undefined = rootTile

  for (const direction of path.directions) {
    if (!current?.children) {
      return undefined
    }
    current = current.children.find(c => c.direction === direction)
    if (!current) {
      return undefined
    }
  }

  return current
}

/**
 * Resolve a child path and extract a specific field value.
 *
 * @param path - The parsed child path with field (e.g., { directions: [-2], field: 'title' })
 * @param rootTile - The tile to start resolution from
 * @returns The field value as string, or undefined if not found
 */
export function resolveChildPathField(
  path: ChildPath,
  rootTile: TileData
): string | undefined {
  const tile = resolveChildPath(path, rootTile)
  if (!tile || !path.field) {
    return undefined
  }

  const value = tile[path.field as keyof TileData]
  return typeof value === 'string' ? value : undefined
}

/**
 * Get children in a direction range from a tile.
 *
 * @param tile - The tile to get children from
 * @param start - Start direction (inclusive)
 * @param end - End direction (inclusive)
 * @returns Array of children in the range, sorted by direction
 */
export function getChildrenInRange(
  tile: TileData,
  start: number,
  end: number
): TileData[] {
  if (!tile.children) {
    return []
  }

  const minDir = Math.min(start, end)
  const maxDir = Math.max(start, end)

  return tile.children
    .filter(c => c.direction !== undefined && c.direction >= minDir && c.direction <= maxDir)
    .sort((a, b) => (a.direction ?? 0) - (b.direction ?? 0))
}

/**
 * Create a child context for loop iterations.
 */
export function createChildContext(
  parentContext: TemplateContext,
  currentItem: TileData
): TemplateContext {
  return {
    ...parentContext,
    currentItem
  }
}

// ==================== INTERNAL FUNCTIONS ====================

function _isTileData(value: unknown): value is TileData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'title' in value &&
    'coords' in value
  )
}
