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
 * For root tiles (when allLeafTasks is provided), generates a flat list of ALL leaf tasks
 * across the entire hierarchy. This enables single-pass execution tracking.
 *
 * For intermediate parent tiles (no allLeafTasks), generates steps for direct children only.
 */
export function generateParentHexplanContent(
  structuralChildren: Array<{ title: string; coords: string }>,
  allLeafTasks?: Array<{ title: string; coords: string }>
): string {
  const lines: string[] = []
  lines.push('🟡 STARTED')
  lines.push('')

  if (allLeafTasks && allLeafTasks.length > 0) {
    lines.push('**Leaf Tasks:**')
    allLeafTasks.forEach((leaf, index) => {
      lines.push(`📋 ${index + 1}. "${leaf.title}" → ${leaf.coords}`)
    })
  } else {
    lines.push('**Steps:**')
    structuralChildren.forEach((child, index) => {
      lines.push(`📋 ${index + 1}. Execute "${child.title}" → ${child.coords}`)
    })
  }

  lines.push('')
  lines.push('**Progress:**')
  lines.push('(initialized)')
  lines.push('')
  lines.push('**Findings:**')
  lines.push('(none yet)')
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
