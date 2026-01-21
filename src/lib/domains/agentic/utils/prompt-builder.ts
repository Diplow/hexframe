/**
 * Hexframe Prompt Builder v6 - Hexrun Introduction
 *
 * Generates execution-ready prompts from tile hierarchies.
 * Delegates to the templates subsystem for mustache-based rendering.
 *
 * This module also provides hexplan content generation utilities
 * for initializing parent and leaf tile hexplans.
 */

// Re-export from templates subsystem
export { buildPrompt, type PromptData } from '~/lib/domains/agentic/templates'

// ==================== HEXPLAN CONTENT GENERATION ====================

/**
 * Generates hexplan content for a parent tile (tile with subtasks).
 * This is used by the API to create/initialize the hexplan tile before prompting.
 *
 * Lists only immediate children as steps (not all leaf tasks).
 * This keeps hexplans concise and instruction-focused.
 *
 * When instruction is provided, it becomes the root hexplan's instruction section,
 * which propagates to all subtask prompts via ancestor context.
 */
export function generateParentHexplanContent(
  structuralChildren: Array<{ title: string; coords: string }>,
  _allLeafTasks?: Array<{ title: string; coords: string }>,
  instruction?: string
): string {
  const lines: string[] = []
  lines.push('🟡 STARTED')
  lines.push('')

  if (instruction) {
    lines.push(`**Instruction:** ${instruction}`)
    lines.push('')
  }

  lines.push('**Steps:**')
  structuralChildren.forEach((child, index) => {
    lines.push(`📋 ${index + 1}. "${child.title}" → ${child.coords}`)
  })

  lines.push('')
  lines.push('**Progress:**')
  lines.push('(none)')
  return lines.join('\n')
}

/**
 * Generates hexplan content for a leaf tile (tile without subtasks).
 * This is used by the API to create/initialize the hexplan tile before prompting.
 */
export function generateLeafHexplanContent(
  taskTitle: string,
  instruction: string | undefined
): string {
  const lines: string[] = []
  lines.push(`🟡 STARTED: "${taskTitle}"`)
  lines.push('')
  if (instruction) {
    lines.push(`**Instruction:** ${instruction}`)
    lines.push('')
  }
  lines.push('📋 Execute the task')
  lines.push('')
  lines.push('**Progress:**')
  lines.push('(initialized)')
  return lines.join('\n')
}
