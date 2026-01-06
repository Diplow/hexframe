/**
 * Child path parser for template variable references.
 *
 * Parses expressions like:
 * - child[-3]           → single child at direction -3
 * - child[-3].title     → title field of child at -3
 * - child[-2,-1]        → nested child: -1 of -2
 * - child[-2,-1].content→ content field of nested child
 * - child[-6..-1]       → range of children (composed)
 * - child[1..6]         → range of children (structural)
 */

// ==================== PUBLIC TYPES ====================

export interface ChildPath {
  directions: number[]
  field?: string
}

export interface ChildRange {
  start: number
  end: number
}

export type ParsedChildRef =
  | { type: 'path'; path: ChildPath }
  | { type: 'range'; range: ChildRange }

// ==================== INTERNAL CONSTANTS ====================

/**
 * Pattern for single/nested child path with optional field.
 * Matches: child[-3], child[-3].title, child[-2,-1], child[-2,-1].content
 */
const CHILD_PATH_PATTERN = /^child\[([-\d,]+)\](?:\.(\w+))?$/

/**
 * Pattern for child range.
 * Matches: child[-6..-1], child[1..6]
 */
const CHILD_RANGE_PATTERN = /^child\[(-?\d+)\.\.(-?\d+)\]$/

/**
 * Valid field names for child access.
 */
const VALID_FIELDS = new Set(['title', 'content', 'preview', 'coords', 'itemType'])

// ==================== PUBLIC FUNCTIONS ====================

/**
 * Parse a child reference expression.
 *
 * @returns ParsedChildRef or null if not a valid child reference
 */
export function parseChildRef(ref: string): ParsedChildRef | null {
  const pathResult = _parseChildPath(ref)
  if (pathResult) {
    return { type: 'path', path: pathResult }
  }

  const rangeResult = _parseChildRange(ref)
  if (rangeResult) {
    return { type: 'range', range: rangeResult }
  }

  return null
}

/**
 * Parse a child path expression (single or nested).
 *
 * @returns ChildPath or null if not a valid path
 */
export function parseChildPath(ref: string): ChildPath | null {
  return _parseChildPath(ref)
}

/**
 * Parse a child range expression.
 *
 * @returns ChildRange or null if not a valid range
 */
export function parseChildRange(ref: string): ChildRange | null {
  return _parseChildRange(ref)
}

/**
 * Format a child path back to string representation.
 *
 * @example formatChildPath({ directions: [-2, -1], field: 'title' }) → 'child[-2,-1].title'
 */
export function formatChildPath(path: ChildPath): string {
  const pathStr = `child[${path.directions.join(',')}]`
  return path.field ? `${pathStr}.${path.field}` : pathStr
}

/**
 * Check if a string looks like a child reference.
 */
export function isChildRef(ref: string): boolean {
  return ref.startsWith('child[')
}

// ==================== INTERNAL FUNCTIONS ====================

function _parseChildPath(ref: string): ChildPath | null {
  const match = CHILD_PATH_PATTERN.exec(ref)
  if (!match) return null

  const directionsStr = match[1]!
  const field = match[2]

  // Parse comma-separated directions
  const directions = directionsStr.split(',').map(d => {
    const num = parseInt(d.trim(), 10)
    return isNaN(num) ? null : num
  })

  // Validate all directions parsed successfully
  if (directions.some(d => d === null)) {
    return null
  }

  // Validate directions are in valid range (-6 to 6, excluding 0)
  if (directions.some(d => d === 0 || d! < -6 || d! > 6)) {
    return null
  }

  // Validate field if present
  if (field && !VALID_FIELDS.has(field)) {
    return null
  }

  return {
    directions: directions as number[],
    field
  }
}

function _parseChildRange(ref: string): ChildRange | null {
  const match = CHILD_RANGE_PATTERN.exec(ref)
  if (!match) return null

  const start = parseInt(match[1]!, 10)
  const end = parseInt(match[2]!, 10)

  // Validate range values
  if (isNaN(start) || isNaN(end)) {
    return null
  }

  // Validate directions are in valid range (-6 to 6, excluding 0)
  if (start === 0 || end === 0 || start < -6 || start > 6 || end < -6 || end > 6) {
    return null
  }

  return { start, end }
}
