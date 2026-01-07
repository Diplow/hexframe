/**
 * Shared utilities for template rendering.
 *
 * Internal module - not exported from the domain.
 */

/**
 * Escape XML special characters in text.
 */
export function _escapeXML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Check if text has non-empty content.
 */
export function _hasContent(text: string | undefined): boolean {
  return !!text && text.trim().length > 0
}
