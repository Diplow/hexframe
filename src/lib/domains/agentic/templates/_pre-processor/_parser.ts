/**
 * Custom template tag parser.
 *
 * Parses {{@TemplateName param=value}} syntax from template strings.
 */

// ==================== PUBLIC TYPES ====================

export interface CustomTag {
  templateName: string
  params: ParsedParams
  originalMatch: string
  startIndex: number
}

export interface ParsedParams {
  item?: string
  fields?: string[]
  wrapper?: string
  depth?: number
  [key: string]: unknown
}

// ==================== INTERNAL CONSTANTS ====================

/**
 * Regex pattern for custom template tags.
 * Matches: {{@TemplateName param1=value1 param2=['a','b']}}
 */
const CUSTOM_TAG_PATTERN = /\{\{@(\w+)\s*([^}]*)\}\}/g

/**
 * Regex pattern for individual parameters.
 * Matches: key=value or key=['a','b','c']
 */
const PARAM_PATTERN = /(\w+)=(?:\[([^\]]*)\]|'([^']*)'|"([^"]*)"|(\S+))/g

// ==================== PUBLIC FUNCTIONS ====================

/**
 * Extract all custom template tags from a template string.
 */
export function parseCustomTags(template: string): CustomTag[] {
  const tags: CustomTag[] = []
  let match: RegExpExecArray | null

  // Reset regex state
  CUSTOM_TAG_PATTERN.lastIndex = 0

  while ((match = CUSTOM_TAG_PATTERN.exec(template)) !== null) {
    const templateName = match[1]!
    const paramString = match[2] ?? ''

    tags.push({
      templateName,
      params: parseParams(paramString),
      originalMatch: match[0],
      startIndex: match.index
    })
  }

  return tags
}

/**
 * Parse parameter string into typed object.
 *
 * Handles:
 * - Simple values: key=value
 * - Quoted strings: key='value' or key="value"
 * - Arrays: key=['a', 'b', 'c']
 * - Numbers: key=3
 * - Booleans: key=true, key=false
 */
export function parseParams(paramString: string): ParsedParams {
  const result: ParsedParams = {}

  if (!paramString.trim()) {
    return result
  }

  // Reset regex state
  PARAM_PATTERN.lastIndex = 0

  let match: RegExpExecArray | null
  while ((match = PARAM_PATTERN.exec(paramString)) !== null) {
    const key = match[1]!
    const arrayValue = match[2]
    const singleQuotedValue = match[3]
    const doubleQuotedValue = match[4]
    const simpleValue = match[5]

    if (arrayValue !== undefined) {
      result[key] = _parseArrayValue(arrayValue)
    } else if (singleQuotedValue !== undefined) {
      result[key] = singleQuotedValue
    } else if (doubleQuotedValue !== undefined) {
      result[key] = doubleQuotedValue
    } else if (simpleValue !== undefined) {
      result[key] = _parseSimpleValue(simpleValue)
    }
  }

  return result
}

// ==================== INTERNAL FUNCTIONS ====================

function _parseArrayValue(arrayContent: string): string[] {
  return arrayContent
    .split(',')
    .map(item => item.trim())
    .map(item => item.replace(/^['"]|['"]$/g, ''))
    .filter(item => item.length > 0)
}

function _parseSimpleValue(value: string): string | number | boolean {
  if (value === 'true') return true
  if (value === 'false') return false

  const numberValue = Number(value)
  if (!isNaN(numberValue)) return numberValue

  return value
}
