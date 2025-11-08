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
 */
export function extractDirection(coords: string): string {
  const lastDash = coords.lastIndexOf('-')
  return lastDash >= 0 ? coords.substring(lastDash + 1) : '0'
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
  const direction = extractDirection(sibling.coords)
  const preview = sibling.preview ?? ''
  return `    <sibling direction="${direction}"><title>${escapeXML(sibling.title)}</title><preview>${escapeXML(preview)}</preview></sibling>`
}

/**
 * Builds XML for a context item
 */
export function buildContextItemXML(item: MapItemContract): string {
  const content = item.content ?? ''
  return `  <item><title>${escapeXML(item.title)}</title><content>${escapeXML(content)}</content></item>`
}

/**
 * Builds XML for a subtask item
 */
export function buildSubtaskXML(item: MapItemContract): string {
  const direction = extractDirection(item.coords)
  const preview = item.preview ?? ''
  return `  <subtask coords="${item.coords}" direction="${direction}"><title>${escapeXML(item.title)}</title><preview>${escapeXML(preview)}</preview></subtask>`
}
