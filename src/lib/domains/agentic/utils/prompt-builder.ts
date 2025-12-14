/**
 * Hexframe Prompt Builder v3 - Simplified Structure
 *
 * Generates execution-ready prompts from tile hierarchies.
 * The prompt structure is now minimal - orchestration logic lives in tiles.
 *
 * Template:
 * 1. <context> - Composed children (title + content)
 * 2. <subtasks> - Structural children (title + preview + coords)
 * 3. <task> - Goal (title) + requirements (content)
 * 4. <hexplan> - Direction-0 content OR instructions to initialize
 */

// ==================== TYPES ====================

export interface PromptData {
  task: {
    title: string
    content: string | undefined
    coords: string
  }
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
  instruction: string | undefined
  mcpServerName: string // e.g., 'hexframe', 'debughexframe'
  hexPlan: string | undefined // Content of direction-0 tile, if exists
  hexPlanInitializerPath: string | undefined // Custom path for hexPlan initialization tile (e.g., '1,4')
}

// ==================== CONSTANTS ====================

// Well-known tile path for the "Initialize HexPlan" task
const INIT_HEXPLAN_TILE_PATH = '1,4'

// ==================== XML ESCAPING ====================

function escapeXML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function hasContent(text: string | undefined): boolean {
  return !!text && text.trim().length > 0
}

// ==================== SECTION BUILDERS ====================

function buildContextSection(composedChildren: PromptData['composedChildren']): string {
  const validChildren = composedChildren.filter(child => hasContent(child.content))

  if (validChildren.length === 0) {
    return ''
  }

  const contexts = validChildren.map(
    child =>
      `<context title="${escapeXML(child.title)}" coords="${escapeXML(child.coords)}">\n${escapeXML(child.content)}\n</context>`
  )

  return contexts.join('\n\n')
}

function buildSubtasksSection(structuralChildren: PromptData['structuralChildren']): string {
  if (structuralChildren.length === 0) {
    return ''
  }

  const subtasks = structuralChildren.map(child => {
    const preview = child.preview ?? ''
    return `<subtask-preview title="${escapeXML(child.title)}" coords="${escapeXML(child.coords)}">\n${escapeXML(preview)}\n</subtask-preview>`
  })

  return `<subtasks>\n${subtasks.join('\n\n')}\n</subtasks>`
}

function buildTaskSection(task: PromptData['task']): string {
  const lines: string[] = ['<task>']

  lines.push(`<goal>${escapeXML(task.title)}</goal>`)

  if (hasContent(task.content)) {
    lines.push(escapeXML(task.content!))
  }

  lines.push('</task>')

  return lines.join('\n')
}

function buildHexplanSection(
  hexPlan: string | undefined,
  taskCoords: string,
  instruction: string | undefined,
  mcpServerName: string,
  hexPlanInitializerPath: string | undefined
): string {
  const hexplanCoords = `${taskCoords},0`

  if (hasContent(hexPlan)) {
    // Check if there are any pending steps (📋)
    const hasPendingSteps = hexPlan!.includes('📋')
    const hasBlockedSteps = hexPlan!.includes('🔴')

    if (!hasPendingSteps) {
      // No pending steps - task is complete or blocked
      if (hasBlockedSteps) {
        return `<hexplan-status>BLOCKED</hexplan-status>\n<message>Task has blocked steps. Review the hexplan at ${escapeXML(hexplanCoords)} and resolve blockers before continuing.</message>\n\n<hexplan coords="${escapeXML(hexplanCoords)}">\n${escapeXML(hexPlan!)}\n</hexplan>`
      }
      return `<hexplan-status>COMPLETE</hexplan-status>\n<message>All steps completed for task at ${escapeXML(taskCoords)}.</message>\n\n<hexplan coords="${escapeXML(hexplanCoords)}">\n${escapeXML(hexPlan!)}\n</hexplan>`
    }

    // Hexplan exists with pending steps - show it with execution instructions
    const lines: string[] = []
    lines.push(`<hexplan coords="${escapeXML(hexplanCoords)}">`)
    lines.push(escapeXML(hexPlan!))
    lines.push(`</hexplan>`)
    lines.push('')
    lines.push(`<execution-instructions>`)
    lines.push(`Execute the NEXT PENDING STEP (first 📋) from the hexplan above.`)
    lines.push(``)
    lines.push(`After completing the step:`)
    lines.push(`1. Update the hexplan at ${escapeXML(hexplanCoords)} using updateItem:`)
    lines.push(`   - Change the step status from 📋 to ✅`)
    lines.push(`   - If the step created a sub-hexplan, merge its steps into this hexplan`)
    lines.push(`   - Add a brief note about what was done`)
    lines.push(`2. Return a SHORT summary (1-2 sentences) of what you accomplished`)
    lines.push(``)
    lines.push(`If you cannot complete the step:`)
    lines.push(`- Update the step status to 🔴 BLOCKED with explanation`)
    lines.push(`- Return the blocker so the user can intervene`)
    lines.push(``)
    lines.push(`IMPORTANT: Execute ONLY ONE step, then return. The orchestrator will call you again for the next step.`)
    lines.push(`</execution-instructions>`)

    return lines.join('\n')
  }

  // Hexplan doesn't exist - provide initialization instructions
  const userIdAndGroup = taskCoords.split(':')[0]
  const initPath = hexPlanInitializerPath ?? INIT_HEXPLAN_TILE_PATH
  const initHexPlanTileCoords = `${userIdAndGroup}:${initPath}`
  const initInstruction = `Create a hexplan for the task at ${taskCoords}${instruction ? `. User instruction: ${instruction}` : ''}`

  const lines: string[] = []
  lines.push(`<hexplan coords="${escapeXML(hexplanCoords)}">`)
  lines.push(`No hexplan exists yet. To initialize:`)
  lines.push(`1. Run ${escapeXML(mcpServerName)}:hexecute("${escapeXML(initHexPlanTileCoords)}", "${escapeXML(initInstruction)}")`)
  lines.push(`2. Spawn a subagent with the resulting prompt using the Task tool (do NOT execute directly in current session)`)
  lines.push(`</hexplan>`)

  return lines.join('\n')
}

// ==================== MAIN BUILDER ====================

/**
 * Builds execution-ready XML prompt from task data.
 *
 * Template structure (v3 - Simplified):
 * 1. <context> - Composed children (title + content)
 * 2. <subtasks> - Structural children (title + preview + coords)
 * 3. <task> - Goal (title) + requirements (content)
 * 4. <hexplan> - Direction-0 content OR initialization instructions
 *
 * Empty sections are omitted.
 * Sections are separated by blank lines.
 */
export function buildPrompt(data: PromptData): string {
  const sections = [
    buildContextSection(data.composedChildren),
    buildSubtasksSection(data.structuralChildren),
    buildTaskSection(data.task),
    buildHexplanSection(data.hexPlan, data.task.coords, data.instruction, data.mcpServerName, data.hexPlanInitializerPath)
  ]

  // Filter empty sections and join with blank lines
  return sections
    .filter(section => section.length > 0)
    .join('\n\n')
}
