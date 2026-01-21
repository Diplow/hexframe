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
 *
 * Orchestration is handled externally by RunService - hexplan is just for
 * instruction propagation and agent notes. The instruction propagates to
 * all subtask prompts via ancestor context.
 */
export function generateParentHexplanContent(
  _structuralChildren: Array<{ title: string; coords: string }>,
  _allLeafTasks?: Array<{ title: string; coords: string }>,
  instruction?: string
): string {
  if (!instruction) {
    return ''
  }
  return `**Instruction:** ${instruction}`
}

/**
 * Generates hexplan content for a leaf tile (tile without subtasks).
 *
 * Just contains the instruction if provided. Agent can add notes during execution.
 */
export function generateLeafHexplanContent(
  _taskTitle: string,
  instruction: string | undefined
): string {
  if (!instruction) {
    return ''
  }
  return `**Instruction:** ${instruction}`
}
