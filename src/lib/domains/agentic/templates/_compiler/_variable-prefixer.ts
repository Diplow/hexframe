/**
 * Variable prefixer for template compilation.
 *
 * Transforms template variables to include path prefixes:
 * - {{title}} → {{child[-3].title}}
 * - {{content}} → {{child[-3].content}}
 * - {{coords}} → {{child[-3].coords}}
 */

// ==================== INTERNAL CONSTANTS ====================

/**
 * Pattern for Mustache variables (both double and triple braces).
 * Captures: {{varName}} or {{{varName}}}
 */
const MUSTACHE_VAR_PATTERN = /(\{\{\{?)(\w+)(\}\}\}?)/g

/**
 * Fields that should be prefixed with the current path.
 */
const PREFIXABLE_FIELDS = new Set(['title', 'content', 'preview', 'coords', 'itemType'])

/**
 * Variables that should NOT be prefixed (they have special meaning).
 */
const RESERVED_VARS = new Set(['task', 'hexPlan', 'mcpServerName'])

// ==================== PUBLIC FUNCTIONS ====================

/**
 * Prefix all applicable variables in a template with a path.
 *
 * @param template - The template string to transform
 * @param pathPrefix - The path prefix to add (e.g., [-3, -1])
 * @returns The template with prefixed variables
 *
 * @example
 * prefixVariables('{{title}}', [-3]) → '{{child[-3].title}}'
 * prefixVariables('{{{content}}}', [-3, -1]) → '{{{child[-3,-1].content}}}'
 */
export function prefixVariables(template: string, pathPrefix: number[]): string {
  if (pathPrefix.length === 0) {
    return template
  }

  const pathStr = `child[${pathPrefix.join(',')}]`

  return template.replace(MUSTACHE_VAR_PATTERN, (
    match: string,
    openBraces: string,
    varName: string,
    closeBraces: string
  ) => {
    // Don't prefix reserved variables
    if (RESERVED_VARS.has(varName)) {
      return match
    }

    // Don't prefix non-field variables (they might be conditionals or other constructs)
    if (!PREFIXABLE_FIELDS.has(varName)) {
      return match
    }

    // Transform {{varName}} to {{child[path].varName}}
    return `${openBraces}${pathStr}.${varName}${closeBraces}`
  })
}

/**
 * Format a path array as a child reference string.
 *
 * @param path - The path array (e.g., [-3, -1])
 * @returns The formatted string (e.g., 'child[-3,-1]')
 */
export function formatPath(path: number[]): string {
  return `child[${path.join(',')}]`
}

/**
 * Format a path with a field as a full variable reference.
 *
 * @param path - The path array (e.g., [-3, -1])
 * @param field - The field name (e.g., 'title')
 * @returns The formatted reference (e.g., 'child[-3,-1].title')
 */
export function formatPathWithField(path: number[], field: string): string {
  return `child[${path.join(',')}].${field}`
}
