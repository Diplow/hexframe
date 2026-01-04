/**
 * Template pre-processor module.
 *
 * Expands custom {{@Template}} tags before Mustache rendering.
 */

export { parseCustomTags, parseParams } from '~/lib/domains/agentic/templates/_pre-processor/_parser'
export type { CustomTag, ParsedParams } from '~/lib/domains/agentic/templates/_pre-processor/_parser'

export { resolveItemReference, createChildContext } from '~/lib/domains/agentic/templates/_pre-processor/_resolver'
export type { TileData, TemplateContext } from '~/lib/domains/agentic/templates/_pre-processor/_resolver'

import { parseCustomTags, type ParsedParams } from '~/lib/domains/agentic/templates/_pre-processor/_parser'
import { resolveItemReference, type TemplateContext } from '~/lib/domains/agentic/templates/_pre-processor/_resolver'
import type { TemplateRegistry } from '~/lib/domains/agentic/templates/_templates'

// ==================== PUBLIC TYPES ====================

export class TemplateError extends Error {
  constructor(
    message: string,
    public readonly templateName: string,
    public readonly params: ParsedParams,
    public readonly cause?: Error
  ) {
    super(`Template error in ${templateName}: ${message}`)
    this.name = 'TemplateError'
  }
}

// ==================== PUBLIC FUNCTIONS ====================

/**
 * Pre-process a template string, expanding all {{@Template}} tags.
 *
 * This runs BEFORE Mustache rendering. Custom tags are replaced with
 * their expanded content, then the result is passed to Mustache.
 */
export function preProcess(
  template: string,
  context: TemplateContext,
  registry: TemplateRegistry
): string {
  const tags = parseCustomTags(template)

  if (tags.length === 0) {
    return template
  }

  // Process tags in reverse order to preserve string positions
  let result = template
  for (let i = tags.length - 1; i >= 0; i--) {
    const tag = tags[i]!
    const expanded = _expandTag(tag.templateName, tag.params, context, registry)

    result =
      result.slice(0, tag.startIndex) +
      expanded +
      result.slice(tag.startIndex + tag.originalMatch.length)
  }

  return result
}

// ==================== INTERNAL FUNCTIONS ====================

function _expandTag(
  templateName: string,
  params: ParsedParams,
  context: TemplateContext,
  registry: TemplateRegistry
): string {
  const templateFn = registry[templateName as keyof TemplateRegistry]

  if (!templateFn) {
    const available = Object.keys(registry).join(', ')
    throw new TemplateError(
      `Unknown template "${templateName}". Available: ${available}`,
      templateName,
      params
    )
  }

  const item = resolveItemReference(params.item, context)
  const fields = params.fields ?? ['title', 'content']
  const wrapper = params.wrapper
  const depth = params.depth ?? 3

  try {
    // Call the appropriate template function based on its signature
    switch (templateName) {
      case 'GenericTile':
        return registry.GenericTile(item, fields, wrapper)

      case 'Folder':
        return registry.Folder(item, fields, depth)

      case 'TileOrFolder':
        return registry.TileOrFolder(item, fields, wrapper, depth)

      case 'HexPlan':
        return registry.HexPlan(
          context.hexplanCoords,
          context.hexPlan,
          context.hexplanStatus,
          {
            mcpServerName: context.mcpServerName,
            isParentTile: context.isParentTile,
            taskCoords: context.task.coords
          }
        )

      default:
        throw new TemplateError(
          `No handler for template "${templateName}"`,
          templateName,
          params
        )
    }
  } catch (error) {
    if (error instanceof TemplateError) {
      throw error
    }
    throw new TemplateError(
      error instanceof Error ? error.message : String(error),
      templateName,
      params,
      error instanceof Error ? error : undefined
    )
  }
}
