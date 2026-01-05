/**
 * Internal prompt builder implementation.
 *
 * Transforms PromptData into XML prompts using:
 * 1. Pre-processor for {{@Template}} expansion
 * 2. Mustache for conditional sections
 */

import Mustache from 'mustache'
import { MapItemType } from '~/lib/domains/mapping'
import { SYSTEM_TEMPLATE, type SystemTemplateData, HEXRUN_INTRO, ANCESTOR_INTRO } from '~/lib/domains/agentic/templates/_system-template'
import { USER_TEMPLATE, type UserTemplateData, USER_INTRO } from '~/lib/domains/agentic/templates/_user-template'
import {
  shouldUseOrchestrator,
  buildOrchestratorPrompt
} from '~/lib/domains/agentic/templates/_hexrun-orchestrator-template'
import { preProcess, type TemplateContext, type TileData } from '~/lib/domains/agentic/templates/_pre-processor'
import { templateRegistry, GenericTile, TileOrFolder } from '~/lib/domains/agentic/templates/_templates'

// ==================== PUBLIC TYPES ====================

export interface PromptDataTile {
  title: string
  content?: string
  preview?: string
  coords: string
  itemType?: MapItemType
  children?: PromptDataTile[]
}

export interface PromptData {
  task: {
    title: string
    content: string | undefined
    coords: string
  }
  /** Ancestors from root to parent - content flows top-down */
  ancestors: Array<{
    title: string
    content: string | undefined
    coords: string
    itemType?: MapItemType
  }>
  composedChildren: Array<PromptDataTile>
  structuralChildren: Array<PromptDataTile>
  hexPlan: string
  mcpServerName: string
  allLeafTasks?: Array<{
    title: string
    coords: string
  }>
  itemType: MapItemType
  /** For USER tiles: the current discussion/conversation state */
  discussion?: string
  /** For USER tiles: the user's current message/instruction */
  userMessage?: string
}

// ==================== INTERNAL UTILITIES ====================

function _escapeXML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function _hasContent(text: string | undefined): boolean {
  return !!text && text.trim().length > 0
}

// ==================== INTERNAL SECTION BUILDERS ====================

/**
 * Build context section using GenericTile or TileOrFolder for organizational tiles.
 */
function _buildContextSection(
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
function _buildSubtasksSection(
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
 * Ancestors are ordered root → parent, so we walk backwards and stop at first non-SYSTEM.
 *
 * Example: [USER, ORG, SYSTEM1, SYSTEM2, SYSTEM3] → [SYSTEM1, SYSTEM2, SYSTEM3]
 * Example: [USER, SYSTEM1, ORG, SYSTEM2] → [SYSTEM2] (stops at ORG)
 */
function _filterSystemAncestors(ancestors: PromptData['ancestors']): PromptData['ancestors'] {
  const systemAncestors: PromptData['ancestors'] = []

  // Walk backward from parent, collecting consecutive SYSTEM ancestors
  for (let i = ancestors.length - 1; i >= 0; i--) {
    if (ancestors[i]?.itemType === MapItemType.SYSTEM) {
      systemAncestors.unshift(ancestors[i]!) // prepend to maintain root→parent order
    } else {
      break // stop at first non-SYSTEM
    }
  }

  return systemAncestors
}

/**
 * Build ancestor context section using GenericTile.
 * Only includes SYSTEM ancestors for SYSTEM tiles.
 */
function _buildAncestorContextSection(ancestors: PromptData['ancestors']): string {
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
 * Build sections for USER template - shows available tiles without going beyond organizational.
 */
function _buildSectionsSection(structuralChildren: PromptDataTile[]): string {
  if (structuralChildren.length === 0) {
    return ''
  }

  const sections = structuralChildren.map(child => {
    if (child.itemType === MapItemType.ORGANIZATIONAL) {
      // For organizational tiles, show as folder but don't recurse into children
      return `<section title="${_escapeXML(child.title)}" type="folder" coords="${_escapeXML(child.coords)}">\n${_escapeXML(child.preview ?? '')}\n</section>`
    }
    return `<section title="${_escapeXML(child.title)}" coords="${_escapeXML(child.coords)}">\n${_escapeXML(child.preview ?? '')}\n</section>`
  })

  return `<sections>\n${sections.join('\n\n')}\n</sections>`
}

// ==================== INTERNAL TEMPLATE LOOKUP ====================

const TEMPLATE_LOOKUP_ERRORS = {
  noItemType: 'itemType required for hexecute',
  organizationalNotSupported:
    'ORGANIZATIONAL tiles cannot be executed - they are structural groupings only',
  contextNotImplemented: 'CONTEXT tile templates not yet implemented',
} as const

function _getTemplateByItemType(itemType: MapItemType | null | undefined): string {
  if (itemType === null || itemType === undefined) {
    throw new Error(TEMPLATE_LOOKUP_ERRORS.noItemType)
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
    }
  }
}

function _prepareUserTemplateData(data: PromptData): UserTemplateData {
  const composedChildrenWithContent = data.composedChildren.filter(child =>
    _hasContent(child.content) || child.itemType === MapItemType.ORGANIZATIONAL
  )

  return {
    userIntro: USER_INTRO,

    hasComposedChildren: composedChildrenWithContent.length > 0,
    contextSection: _buildContextSection(data.composedChildren, true),

    hasSections: data.structuralChildren.length > 0,
    sectionsSection: _buildSectionsSection(data.structuralChildren),

    hasRecentHistory: _hasContent(data.hexPlan),
    recentHistory: data.hexPlan,
    recentHistoryCoords: `${data.task.coords},0`,

    hasDiscussion: _hasContent(data.discussion),
    discussion: data.discussion ?? '',

    hasUserMessage: _hasContent(data.userMessage),
    userMessage: data.userMessage ?? ''
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
 * USER template structure:
 * 1. <user-intro> - Explains agent role as user's interlocutor
 * 2. <context> - Context children with folder support
 * 3. <sections> - Available tiles (title + preview, stops at organizational)
 * 4. <recent-history> - Session continuity (renamed hexplan)
 * 5. <discussion> - Current exchange state
 *
 * Empty sections are omitted.
 */
export function buildPrompt(data: PromptData): string {
  // For SYSTEM tiles with userMessage (from @-mention), use orchestrator
  if (shouldUseOrchestrator(data.itemType, data.userMessage)) {
    return buildOrchestratorPrompt(data)
  }

  const template = _getTemplateByItemType(data.itemType)

  // Prepare template data based on item type
  const templateData = data.itemType === MapItemType.USER
    ? _prepareUserTemplateData(data)
    : _prepareSystemTemplateData(data)

  // Pre-process {{@Template}} tags (only for SYSTEM template currently)
  const preProcessorContext = _buildPreProcessorContext(data)
  const preprocessedTemplate = preProcess(template, preProcessorContext, templateRegistry)

  // Render with Mustache
  const rendered = Mustache.render(preprocessedTemplate, templateData)

  return rendered
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n\n$/g, '')
    .trim()
}
