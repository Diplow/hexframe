/**
 * Internal prompt builder implementation.
 *
 * Transforms PromptData into XML prompts using:
 * 1. Pre-processor for {{@Template}} expansion (legacy)
 * 2. Compiler for {{@RenderChildren}} expansion (pool-based)
 * 3. Mustache for conditional sections
 */

import Mustache from 'mustache'
import { MapItemType, type ItemTypeValue, isBuiltInItemType } from '~/lib/domains/mapping/utils'
import { SYSTEM_TEMPLATE, type SystemTemplateData, HEXRUN_INTRO } from '~/lib/domains/agentic/templates/_system-template'
import {
  USER_TEMPLATE,
  USER_SUB_TEMPLATES,
  USER_TEMPLATE_CONTEXT,
  type UserTemplateData
} from '~/lib/domains/agentic/templates/_user-template'
import {
  shouldUseOrchestrator,
  buildOrchestratorPrompt
} from '~/lib/domains/agentic/templates/_hexrun-orchestrator-template'
import { preProcess, type TemplateContext, type TileData } from '~/lib/domains/agentic/templates/_pre-processor'
import { templateRegistry } from '~/lib/domains/agentic/templates/_templates'
import { _escapeXML, _hasContent } from '~/lib/domains/agentic/templates/_internals/utils'
import {
  _buildContextSection,
  _buildSubtasksSection,
  _filterSystemAncestors,
  _buildAncestorContextSection
} from '~/lib/domains/agentic/templates/_internals/section-builders'
import {
  usesPoolBasedRendering,
  twoPhaseRender
} from '~/lib/domains/agentic/templates/_compiler'

// Re-export types from _types.ts for backward compatibility
export type { PromptDataTile, PromptData } from '~/lib/domains/agentic/templates/_internals/types'
import type { PromptData } from '~/lib/domains/agentic/templates/_internals/types'

// ==================== INTERNAL TEMPLATE LOOKUP ====================

const TEMPLATE_LOOKUP_ERRORS = {
  noItemType: 'itemType required for hexecute',
  organizationalNotSupported:
    'ORGANIZATIONAL tiles cannot be executed - they are structural groupings only',
  contextNotImplemented: 'CONTEXT tile templates not yet implemented',
} as const

function _getTemplateByItemType(itemType: ItemTypeValue | null | undefined): string {
  if (itemType === null || itemType === undefined) {
    throw new Error(TEMPLATE_LOOKUP_ERRORS.noItemType)
  }

  // Handle custom (non-built-in) item types by using SYSTEM template
  // Custom types like "template" are treated as executable tiles
  if (!isBuiltInItemType(itemType)) {
    return SYSTEM_TEMPLATE
  }

  switch (itemType) {
    case MapItemType.SYSTEM:
      return SYSTEM_TEMPLATE

    case MapItemType.USER:
      return USER_TEMPLATE

    case MapItemType.ORGANIZATIONAL:
      throw new Error(TEMPLATE_LOOKUP_ERRORS.organizationalNotSupported)

    case MapItemType.CONTEXT:
      throw new Error(TEMPLATE_LOOKUP_ERRORS.contextNotImplemented)

    default: {
      const exhaustiveCheck: never = itemType
      throw new Error(`Unknown itemType: ${String(exhaustiveCheck)}`)
    }
  }
}

// ==================== INTERNAL DATA TRANSFORMATION ====================

function _getHexplanStatus(hexPlan: string): 'pending' | 'complete' | 'blocked' {
  const hasPendingSteps = hexPlan.includes('📋')
  const hasBlockedSteps = hexPlan.includes('🔴')

  if (hasPendingSteps) return 'pending'
  if (hasBlockedSteps) return 'blocked'
  return 'complete'
}

function _prepareSystemTemplateData(data: PromptData): SystemTemplateData {
  const systemAncestors = _filterSystemAncestors(data.ancestors)
  const ancestorsWithContent = systemAncestors.filter(ancestor =>
    _hasContent(ancestor.content)
  )

  const composedChildrenWithContent = data.composedChildren.filter(child =>
    _hasContent(child.content) || child.itemType === MapItemType.ORGANIZATIONAL
  )

  return {
    hexrunIntro: HEXRUN_INTRO,

    hasAncestorsWithContent: ancestorsWithContent.length > 0,
    ancestorContextSection: _buildAncestorContextSection(data.ancestors),

    hasComposedChildren: composedChildrenWithContent.length > 0,
    contextSection: _buildContextSection(data.composedChildren, false),

    hasSubtasks: data.structuralChildren.length > 0,
    subtasksSection: _buildSubtasksSection(data.structuralChildren, false),

    task: {
      title: _escapeXML(data.task.title),
      hasContent: _hasContent(data.task.content),
      content: data.task.content ?? ''
    },

    // Simplified HexPlan (for tile-based templates)
    hasHexplan: _hasContent(data.hexPlan),
    hexplanCoords: `${data.task.coords},0`,
    hexPlan: data.hexPlan
  }
}

function _prepareUserTemplateData(data: PromptData): UserTemplateData {
  return {
    hasDiscussion: _hasContent(data.discussion),
    discussion: data.discussion ?? '',

    hasUserMessage: _hasContent(data.userMessage),
    userMessage: data.userMessage ?? ''
  }
}

/**
 * Build a template tile for USER template with sub-templates and context.
 */
function _buildUserTemplateTile(): TileData {
  return {
    title: 'User Interlocutor Template',
    content: USER_TEMPLATE,
    coords: '',
    itemType: 'template',
    children: [
      // Template context at direction -1
      {
        title: 'user-intro',
        content: USER_TEMPLATE_CONTEXT,
        coords: '',
        itemType: 'context',
        direction: -1
      },
      // Sub-templates at directions 1-5
      ...USER_SUB_TEMPLATES
    ]
  }
}

function _buildPreProcessorContext(data: PromptData): TemplateContext {
  const hexplanCoords = `${data.task.coords},0`

  return {
    task: data.task as TileData,
    ancestors: data.ancestors as TileData[],
    composedChildren: data.composedChildren as TileData[],
    structuralChildren: data.structuralChildren as TileData[],
    hexPlan: data.hexPlan,
    hexplanCoords,
    mcpServerName: data.mcpServerName,
    isParentTile: data.structuralChildren.length > 0,
    hexplanStatus: _getHexplanStatus(data.hexPlan)
  }
}

// ==================== PUBLIC API ====================

/**
 * Builds execution-ready XML prompt from task data.
 *
 * SYSTEM template structure:
 * 1. <hexrun-intro> - Explains the iterative execution model
 * 2. <ancestor-context> - SYSTEM ancestors only (stops at non-SYSTEM)
 * 3. <context> - Composed children (title + content)
 * 4. <subtasks> - Structural children (title + preview + coords)
 * 5. <task> - Goal (title) + requirements (content)
 * 6. <hexplan> - Direction-0 content with execution instructions
 *
 * USER template structure (pool-based):
 * 1. <user-intro> - From template context at direction -1
 * 2. <context> - Context children via {{@RenderChildren range=[-6..-1]}}
 * 3. <sections> - Structural children via {{@RenderChildren range=[1..6]}}
 * 4. <recent-history> - Direction-0 via {{@RenderChildren range=[0..0]}}
 * 5. <discussion> - Current exchange state (Mustache variable)
 * 6. <user-message> - User's current message (Mustache variable)
 *
 * Empty sections are omitted.
 */
export function buildPrompt(data: PromptData): string {
  // For SYSTEM tiles with userMessage (from @-mention), use orchestrator
  if (shouldUseOrchestrator(data.itemType, data.userMessage)) {
    return buildOrchestratorPrompt(data)
  }

  const template = _getTemplateByItemType(data.itemType)

  // Check if template uses pool-based rendering ({{@RenderChildren}})
  if (usesPoolBasedRendering(template)) {
    return _buildPoolBasedPrompt(data, template)
  }

  // Legacy path: pre-rendered sections
  // Prepare template data based on item type
  const templateData = data.itemType === (MapItemType.USER as ItemTypeValue)
    ? _prepareUserTemplateData(data)
    : _prepareSystemTemplateData(data)

  // Pre-process {{@Template}} tags (for SYSTEM template)
  const preProcessorContext = _buildPreProcessorContext(data)
  const preprocessedTemplate = preProcess(template, preProcessorContext, templateRegistry)

  // Render with Mustache
  const rendered = Mustache.render(preprocessedTemplate, templateData)

  return rendered
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n\n$/g, '')
    .trim()
}

/**
 * Build prompt using pool-based rendering for templates with {{@RenderChildren}}.
 */
function _buildPoolBasedPrompt(data: PromptData, template: string): string {
  // Build template tile with sub-templates
  const templateTile = data.itemType === (MapItemType.USER as ItemTypeValue)
    ? _buildUserTemplateTile()
    : { title: 'Template', content: template, coords: '', itemType: 'template' }

  // Convert PromptData to TileData for the compiler
  const taskTile = _buildTaskTileForUserTemplate(data)

  // Prepare additional Mustache data (non-tile data like discussion, userMessage)
  const userTemplateData = _prepareUserTemplateData(data)
  const additionalData: Record<string, unknown> = { ...userTemplateData }

  // Use two-phase render: compile + Mustache
  const result = twoPhaseRender({
    templateTile,
    taskTile,
    ancestors: [], // USER tiles have no ancestors
    fallbackTemplateName: 'generic',
    additionalData
  })

  return result.rendered
}

/**
 * Build a TileData structure for USER template rendering.
 * Merges composed children, structural children, and hexplan (direction-0).
 */
function _buildTaskTileForUserTemplate(data: PromptData): TileData {
  const children: TileData[] = []

  // Add composed children (negative directions)
  for (const child of data.composedChildren) {
    const direction = _extractDirection(child.coords)
    children.push({
      title: child.title,
      content: child.content,
      preview: child.preview,
      coords: child.coords,
      itemType: child.itemType,
      direction,
      children: child.children?.map(c => _convertPromptDataTileToTileData(c))
    })
  }

  // Add structural children (positive directions)
  for (const child of data.structuralChildren) {
    const direction = _extractDirection(child.coords)
    children.push({
      title: child.title,
      content: child.content,
      preview: child.preview,
      coords: child.coords,
      itemType: child.itemType,
      direction,
      children: child.children?.map(c => _convertPromptDataTileToTileData(c))
    })
  }

  // Add hexplan as direction-0 child (for recent-history)
  // No itemType so it uses the 'recent-history' fallback template
  if (_hasContent(data.hexPlan)) {
    children.push({
      title: 'Recent History',
      content: data.hexPlan,
      coords: `${data.task.coords},0`,
      direction: 0
    })
  }

  return {
    title: data.task.title,
    content: data.task.content,
    coords: data.task.coords,
    itemType: data.itemType,
    children: children.length > 0 ? children : undefined
  }
}

/**
 * Convert PromptDataTile to TileData recursively.
 */
function _convertPromptDataTileToTileData(tile: PromptData['composedChildren'][0]): TileData {
  return {
    title: tile.title,
    content: tile.content,
    preview: tile.preview,
    coords: tile.coords,
    itemType: tile.itemType,
    direction: tile.direction ?? _extractDirection(tile.coords),
    children: tile.children?.map(c => _convertPromptDataTileToTileData(c))
  }
}

/**
 * Extract direction from coords string.
 * Example: "userId,0:1,2,-3" → -3
 */
function _extractDirection(coords: string): number | undefined {
  const pathPart = coords.split(':')[1]
  if (!pathPart) return undefined

  const directions = pathPart.split(',').map(d => parseInt(d, 10))
  const lastDir = directions[directions.length - 1]

  return lastDir !== undefined && !isNaN(lastDir) ? lastDir : undefined
}
