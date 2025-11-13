import type { MapItemContract } from '~/lib/domains/mapping/utils'
import { escapeXML } from '~/lib/domains/agentic/services/_prompt-executor-helpers'

/**
 * Task hierarchy data for prompt execution (minimal - agent gathers rest via MCP)
 */
export interface TaskHierarchyData {
  center: MapItemContract
  composedChildren: MapItemContract[]
  parentTask?: {
    title: string
    preview: string | undefined
    coords: string
  }
}

/**
 * Parameters for prompt execution
 */
export interface ExecutePromptParams {
  taskData: TaskHierarchyData
  instruction?: string
  executionHistoryContent?: string
}

/**
 * Pure business logic: builds an XML prompt from task data and composed children.
 *
 * SIMPLIFIED ARCHITECTURE:
 * - If parentTask is provided: This task was reached via meta-task redirect
 *   → Include parent context in execution-context section
 * - Otherwise: Direct execution of the requested task
 *
 * @param params - Task data, optional instruction, and execution history content
 * @returns XML-formatted prompt string
 */
export function executePrompt(params: ExecutePromptParams): string {
  const { taskData, instruction, executionHistoryContent } = params

  const sections = [
    '<hexframe-session>',
    '',
    buildTaskSection(taskData.center),
    '',
    buildComposedChildrenSections(taskData.composedChildren),
    '',
    buildExecutionContextSection(
      instruction,
      taskData.center.coords,
      executionHistoryContent,
      taskData.parentTask
    ),
    '',
    '</hexframe-session>'
  ]

  return sections.filter(s => s.length > 0).join('\n')
}

function buildTaskSection(center: MapItemContract): string {
  const lines: string[] = ['<task>']
  lines.push(`  <title>${escapeXML(center.title)}</title>`)

  if (center.content && center.content.trim().length > 0) {
    lines.push(`  <content>${escapeXML(center.content)}</content>`)
  }

  lines.push(`  <coordinates>${escapeXML(center.coords)}</coordinates>`)
  lines.push('</task>')

  return lines.join('\n')
}

/**
 * Build sections for all composed children.
 * Each composed child becomes its own section - simple concatenation.
 */
function buildComposedChildrenSections(composedChildren: MapItemContract[]): string {
  if (composedChildren.length === 0) {
    return ''
  }

  // Filter out empty tiles
  const validChildren = composedChildren.filter(
    child => child.content && child.content.trim().length > 0
  )

  if (validChildren.length === 0) {
    return ''
  }

  const sections: string[] = []

  for (const child of validChildren) {
    // Determine section name based on tile title
    const sectionName = child.title.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    sections.push(`<${sectionName}>`)
    sections.push(escapeXML(child.content))
    sections.push(`</${sectionName}>`)
  }

  return sections.join('\n\n')
}

function buildExecutionContextSection(
  instruction: string | undefined,
  taskCoords: string,
  executionHistoryContent: string | undefined,
  parentTask?: { title: string; preview: string | undefined; coords: string }
): string {
  // Calculate storage coords (execution history at direction 0,0)
  const storageCoords = `${taskCoords},0,0`

  const lines: string[] = ['<execution-context>']

  lines.push(`  <storage-location>${escapeXML(storageCoords)}</storage-location>`)

  // Include parent task info if this was reached via meta-task redirect
  if (parentTask) {
    lines.push(`  <parent-task>`)
    lines.push(`    <title>${escapeXML(parentTask.title)}</title>`)
    if (parentTask.preview) {
      lines.push(`    <preview>${escapeXML(parentTask.preview)}</preview>`)
    }
    lines.push(`    <coordinates>${escapeXML(parentTask.coords)}</coordinates>`)
    lines.push(`  </parent-task>`)
  }

  if (instruction) {
    lines.push(`  <current-instruction>${escapeXML(instruction)}</current-instruction>`)
  }

  // Include execution history content if available
  if (executionHistoryContent && executionHistoryContent.trim().length > 0) {
    lines.push(`  <history>`)
    lines.push(escapeXML(executionHistoryContent))
    lines.push(`  </history>`)
  } else {
    lines.push(`  <history>No execution history yet - this is the first execution.</history>`)
  }

  lines.push('</execution-context>')
  return lines.join('\n')
}
