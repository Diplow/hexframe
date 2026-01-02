/**
 * Internal prompt builder implementation.
 *
 * Transforms PromptData into XML prompts using Mustache templates.
 */

import Mustache from 'mustache'
import { MapItemType } from '~/lib/domains/mapping'
import { SYSTEM_TEMPLATE, type SystemTemplateData, HEXRUN_INTRO, ANCESTOR_INTRO } from '~/lib/domains/agentic/templates/_system-template'

// ==================== PUBLIC TYPES ====================

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
  }>
  composedChildren: Array<{
    title: string
    content: string
    coords: string
  }>
  structuralChildren: Array<{
    title: string
    preview: string | undefined
    coords: string
  }>
  hexPlan: string
  mcpServerName: string
  allLeafTasks?: Array<{
    title: string
    coords: string
  }>
  itemType: MapItemType
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

function _buildContextSection(composedChildren: PromptData['composedChildren']): string {
  const validChildren = composedChildren.filter(child => _hasContent(child.content))

  if (validChildren.length === 0) {
    return ''
  }

  const contexts = validChildren.map(
    child =>
      `<context title="${_escapeXML(child.title)}" coords="${_escapeXML(child.coords)}">\n${_escapeXML(child.content)}\n</context>`
  )

  return contexts.join('\n\n')
}

function _buildSubtasksSection(structuralChildren: PromptData['structuralChildren']): string {
  if (structuralChildren.length === 0) {
    return ''
  }

  const subtasks = structuralChildren.map(child => {
    const preview = child.preview ?? ''
    return `<subtask-preview title="${_escapeXML(child.title)}" coords="${_escapeXML(child.coords)}">\n${_escapeXML(preview)}\n</subtask-preview>`
  })

  return `<subtasks>\n${subtasks.join('\n\n')}\n</subtasks>`
}

function _buildAncestorContextSection(ancestors: PromptData['ancestors']): string {
  const ancestorsWithContent = ancestors.filter(ancestor =>
    _hasContent(ancestor.content)
  )

  if (ancestorsWithContent.length === 0) {
    return ''
  }

  const ancestorBlocks = ancestorsWithContent.map(
    ancestor =>
      `<ancestor title="${_escapeXML(ancestor.title)}" coords="${_escapeXML(ancestor.coords)}">\n${_escapeXML(ancestor.content!)}\n</ancestor>`
  )

  return `<ancestor-context>\n${ANCESTOR_INTRO}\n\n${ancestorBlocks.join('\n\n')}\n</ancestor-context>`
}

// ==================== INTERNAL TEMPLATE LOOKUP ====================

const TEMPLATE_LOOKUP_ERRORS = {
  noItemType: 'itemType required for hexecute',
  organizationalNotSupported:
    'ORGANIZATIONAL tiles cannot be executed - they are structural groupings only',
  userNotImplemented: 'USER tile templates not yet implemented',
  contextNotImplemented: 'CONTEXT tile templates not yet implemented',
} as const

function _getTemplateByItemType(itemType: MapItemType | null | undefined): string {
  if (itemType === null || itemType === undefined) {
    throw new Error(TEMPLATE_LOOKUP_ERRORS.noItemType)
  }

  switch (itemType) {
    case MapItemType.SYSTEM:
      return SYSTEM_TEMPLATE

    case MapItemType.ORGANIZATIONAL:
      throw new Error(TEMPLATE_LOOKUP_ERRORS.organizationalNotSupported)

    case MapItemType.USER:
      throw new Error(TEMPLATE_LOOKUP_ERRORS.userNotImplemented)

    case MapItemType.CONTEXT:
      throw new Error(TEMPLATE_LOOKUP_ERRORS.contextNotImplemented)

    default: {
      const exhaustiveCheck: never = itemType
      throw new Error(`Unknown itemType: ${String(exhaustiveCheck)}`)
    }
  }
}

// ==================== INTERNAL DATA TRANSFORMATION ====================

function _prepareSystemTemplateData(data: PromptData): SystemTemplateData {
  const ancestorsWithContent = data.ancestors.filter(ancestor =>
    _hasContent(ancestor.content)
  )

  const composedChildrenWithContent = data.composedChildren.filter(child =>
    _hasContent(child.content)
  )

  const hasPendingSteps = data.hexPlan.includes('📋')
  const hasBlockedSteps = data.hexPlan.includes('🔴')

  const hexplanCoords = `${data.task.coords},0`

  return {
    hexrunIntro: HEXRUN_INTRO,

    hasAncestorsWithContent: ancestorsWithContent.length > 0,
    ancestorContextSection: _buildAncestorContextSection(data.ancestors),

    hasComposedChildren: composedChildrenWithContent.length > 0,
    contextSection: _buildContextSection(data.composedChildren),

    hasSubtasks: data.structuralChildren.length > 0,
    subtasksSection: _buildSubtasksSection(data.structuralChildren),

    task: {
      title: _escapeXML(data.task.title),
      hasContent: _hasContent(data.task.content),
      content: data.task.content ? _escapeXML(data.task.content) : ''
    },

    hexplanPending: hasPendingSteps,
    hexplanComplete: !hasPendingSteps && !hasBlockedSteps,
    hexplanBlocked: !hasPendingSteps && hasBlockedSteps,

    hexplanCoords: _escapeXML(hexplanCoords),
    hexPlan: _escapeXML(data.hexPlan),
    taskCoords: _escapeXML(data.task.coords),

    isParentTile: data.structuralChildren.length > 0,
    mcpServerName: data.mcpServerName
  }
}

// ==================== PUBLIC API ====================

/**
 * Builds execution-ready XML prompt from task data.
 *
 * Template structure:
 * 1. <hexrun-intro> - Explains the iterative execution model
 * 2. <ancestor-context> - Parent content flowing top-down (root → parent)
 * 3. <context> - Composed children (title + content)
 * 4. <subtasks> - Structural children (title + preview + coords)
 * 5. <task> - Goal (title) + requirements (content)
 * 6. <hexplan> - Direction-0 content with execution instructions
 *
 * Empty sections are omitted (except hexrun-intro which is always shown).
 * Sections are separated by blank lines.
 */
export function buildPrompt(data: PromptData): string {
  const template = _getTemplateByItemType(data.itemType)
  const templateData = _prepareSystemTemplateData(data)
  const rendered = Mustache.render(template, templateData)

  return rendered
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n\n$/g, '')
    .trim()
}
