import type { MapItemContract } from '~/lib/domains/mapping/utils'
import {
  escapeXML,
  buildAncestorXML,
  buildSiblingXML,
  buildContextItemXML,
  buildSubtaskXML
} from '~/lib/domains/agentic/services/_prompt-executor-helpers'

/**
 * Task hierarchy data for prompt execution
 */
export interface TaskHierarchyData {
  center: MapItemContract
  ancestry: MapItemContract[]
  siblings: MapItemContract[]
  composedChildren: MapItemContract[]
  regularChildren: MapItemContract[]
}

/**
 * Parameters for prompt execution
 */
export interface ExecutePromptParams {
  orchestratorContent: string
  taskData: TaskHierarchyData
}

/**
 * Pure business logic: concatenates orchestrator content with task hierarchy
 * into a structured XML prompt for AI execution.
 *
 * @param params - Orchestrator content and task hierarchy data
 * @returns XML-formatted prompt string
 */
export function executePrompt(params: ExecutePromptParams): string {
  const { orchestratorContent, taskData } = params

  const sections = [
    orchestratorContent,
    buildGoalSection(taskData),
    buildContextSection(taskData.composedChildren),
    buildPlanSection(taskData.regularChildren)
  ]

  return sections.filter(s => s.length > 0).join('\n\n')
}

function buildGoalSection(data: TaskHierarchyData): string {
  const { center, ancestry, siblings } = data
  const lines: string[] = ['<goal>']

  lines.push(`  <title>${escapeXML(center.title)}</title>`)
  if (center.content) {
    lines.push(`  <content>${escapeXML(center.content)}</content>`)
  }

  if (ancestry.length > 0) {
    lines.push('  <ancestry>')
    for (const ancestor of ancestry) {
      lines.push(buildAncestorXML(ancestor))
    }
    lines.push('  </ancestry>')
  }

  if (siblings.length > 0) {
    lines.push('  <siblings>')
    for (const sibling of siblings) {
      lines.push(buildSiblingXML(sibling))
    }
    lines.push('  </siblings>')
  }

  lines.push('</goal>')
  return lines.join('\n')
}

function buildContextSection(composedChildren: MapItemContract[]): string {
  if (composedChildren.length === 0) return ''

  const lines: string[] = ['<context>']
  for (const child of composedChildren) {
    lines.push(buildContextItemXML(child))
  }
  lines.push('</context>')
  return lines.join('\n')
}

function buildPlanSection(regularChildren: MapItemContract[]): string {
  if (regularChildren.length === 0) return ''

  const lines: string[] = ['<plan>']
  for (const child of regularChildren) {
    lines.push(buildSubtaskXML(child))
  }
  lines.push('</plan>')
  return lines.join('\n')
}
