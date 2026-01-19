/**
 * Internal section builder functions for prompt generation.
 *
 * Extracted from _prompt-builder.ts to follow Rule of 6.
 */

import { MapItemType } from '~/lib/domains/mapping'
import type { TileData } from '~/lib/domains/agentic/templates/_pre-processor'
import { GenericTile, TileOrFolder } from '~/lib/domains/agentic/templates/_templates'
import { ANCESTOR_INTRO } from '~/lib/domains/agentic/templates/_system-template'
import { _escapeXML, _hasContent } from '~/lib/domains/agentic/templates/_internals/utils'
import type { PromptDataTile, PromptData } from '~/lib/domains/agentic/templates/_internals/types'

/**
 * Build context section using GenericTile or TileOrFolder for organizational tiles.
 */
export function _buildContextSection(
  composedChildren: PromptDataTile[],
  supportFolders: boolean
): string {
  const validChildren = composedChildren.filter(child =>
    _hasContent(child.content) || child.itemType === MapItemType.ORGANIZATIONAL
  )

  if (validChildren.length === 0) {
    return ''
  }

  const contexts = validChildren.map(child => {
    if (supportFolders && child.itemType === MapItemType.ORGANIZATIONAL) {
      return TileOrFolder(child as TileData, ['title', 'content'], 'context', 3)
    }
    return GenericTile(child as TileData, ['title', 'content'], 'context')
  })

  return contexts.filter(c => c.length > 0).join('\n\n')
}

/**
 * Build subtasks section using GenericTile or TileOrFolder for organizational tiles.
 */
export function _buildSubtasksSection(
  structuralChildren: PromptDataTile[],
  supportFolders: boolean
): string {
  if (structuralChildren.length === 0) {
    return ''
  }

  const subtasks = structuralChildren.map(child => {
    if (supportFolders && child.itemType === MapItemType.ORGANIZATIONAL) {
      return TileOrFolder(child as TileData, ['title', 'preview'], 'subtask-preview', 3)
    }
    return GenericTile(child as TileData, ['title', 'preview'], 'subtask-preview')
  })

  return `<subtasks>\n${subtasks.filter(s => s.length > 0).join('\n\n')}\n</subtasks>`
}

/**
 * Filter ancestors to only include consecutive SYSTEM ancestors from the parent backwards.
 */
export function _filterSystemAncestors(ancestors: PromptData['ancestors']): PromptData['ancestors'] {
  const systemAncestors: PromptData['ancestors'] = []

  for (let i = ancestors.length - 1; i >= 0; i--) {
    if (ancestors[i]?.itemType === MapItemType.SYSTEM) {
      systemAncestors.unshift(ancestors[i]!)
    } else {
      break
    }
  }

  return systemAncestors
}

/**
 * Build ancestor context section using GenericTile.
 */
export function _buildAncestorContextSection(ancestors: PromptData['ancestors']): string {
  const systemAncestors = _filterSystemAncestors(ancestors)
  const ancestorsWithContent = systemAncestors.filter(ancestor =>
    _hasContent(ancestor.content)
  )

  if (ancestorsWithContent.length === 0) {
    return ''
  }

  const ancestorBlocks = ancestorsWithContent.map(ancestor =>
    GenericTile(ancestor as TileData, ['title', 'content'], 'ancestor')
  )

  return `<ancestor-context>\n${ANCESTOR_INTRO}\n\n${ancestorBlocks.join('\n\n')}\n</ancestor-context>`
}

/**
 * Build sections for USER template.
 */
export function _buildSectionsSection(structuralChildren: PromptDataTile[]): string {
  if (structuralChildren.length === 0) {
    return ''
  }

  const sections = structuralChildren.map(child => {
    if (child.itemType === MapItemType.ORGANIZATIONAL) {
      return `<section title="${_escapeXML(child.title)}" type="folder" coords="${_escapeXML(child.coords)}">\n${_escapeXML(child.preview ?? '')}\n</section>`
    }
    return `<section title="${_escapeXML(child.title)}" coords="${_escapeXML(child.coords)}">\n${_escapeXML(child.preview ?? '')}\n</section>`
  })

  return `<sections>\n${sections.join('\n\n')}\n</sections>`
}
