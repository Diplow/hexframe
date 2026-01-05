/**
 * Template context resolver.
 *
 * Resolves item references (., this, path.to.value) to actual data.
 */

import type { MapItemType } from '~/lib/domains/mapping'

// ==================== PUBLIC TYPES ====================

export interface TileData {
  title: string
  content?: string
  preview?: string
  coords: string
  itemType?: MapItemType
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
