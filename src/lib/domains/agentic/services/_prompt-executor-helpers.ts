import type { MapItemContract } from '~/lib/domains/mapping/utils'

/**
 * Escapes XML special characters in text
 */
export function escapeXML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Extracts the direction from a coordinate string
 * Preserves negative signs for composed children (directions -1 to -6)
 */
export function extractDirection(coords: string): string {
  const parts = coords.split(':')
  if (parts.length < 2 || !parts[1]) return '0'

  const pathSegments = parts[1].split(',').filter((s) => s !== '')
  if (pathSegments.length === 0) return '0'

  const lastSegment = pathSegments[pathSegments.length - 1]
  return lastSegment ?? '0'
}

/**
 * Builds XML for an ancestor item
 */
export function buildAncestorXML(ancestor: MapItemContract): string {
  const preview = ancestor.preview ?? ''
  return `    <ancestor depth="${ancestor.depth}"><title>${escapeXML(ancestor.title)}</title><preview>${escapeXML(preview)}</preview></ancestor>`
}

/**
 * Builds XML for a sibling item
 */
export function buildSiblingXML(sibling: MapItemContract): string {
  const preview = sibling.preview ?? ''
  return `    <sibling coords="${sibling.coords}"><title>${escapeXML(sibling.title)}</title><preview>${escapeXML(preview)}</preview></sibling>`
}

/**
 * Builds XML for a context item
 */
export function buildContextItemXML(item: MapItemContract): string {
  const content = item.content ?? ''
  return `  <contextItem>\n    <title>${escapeXML(item.title)}</title>\n    <content>${escapeXML(content)}</content>\n  </contextItem>`
}

/**
 * Builds XML for a subtask item
 * Each subtask should be executed in a subagent using hexecute with the child tile coordinates
 */
export function buildSubtaskXML(item: MapItemContract): string {
  const preview = item.preview ?? ''
  return `  <subtask coords="${item.coords}"><title>${escapeXML(item.title)}</title><preview>${escapeXML(preview)}</preview></subtask>`
}

/**
 * Flattens a tree of items into post-order (leaves first, then parents)
 *
 * Example tree:
 * - A (has children A1, A2)
 * - B (has children B1, B2)
 *
 * Returns: [A1, A2, A, B1, B2, B]
 *
 * This enables "flatten TODO" workflow where leaf tasks are executed first,
 * then parent tasks finalize after their children complete.
 */
export function flattenToPostOrder(items: MapItemContract[]): MapItemContract[] {
  const result: MapItemContract[] = []

  function traverse(item: MapItemContract) {
    // First, recursively process children (if they have a 'children' property)
    const children = (item as MapItemContract & { children?: MapItemContract[] }).children
    if (children && children.length > 0) {
      for (const child of children) {
        traverse(child)
      }
    }

    // Then add the item itself (post-order: children before parent)
    result.push(item)
  }

  for (const item of items) {
    traverse(item)
  }

  return result
}
