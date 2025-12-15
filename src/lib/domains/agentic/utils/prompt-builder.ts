/**
 * Hexframe Prompt Builder v4 - Programmatic Hexplan Generation
 *
 * Generates execution-ready prompts from tile hierarchies.
 * The prompt structure is minimal - orchestration logic is derived from tile type.
 *
 * Template:
 * 1. <context> - Composed children (title + content)
 * 2. <subtasks> - Structural children (title + preview + coords)
 * 3. <task> - Goal (title) + requirements (content)
 * 4. <hexplan> / <execution-instructions> - Based on tile type and hexplan state
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
  hexPlan: string // Content of direction-0 tile (always exists - created by API if missing)
  mcpServerName: string // MCP server name for tool calls (e.g., 'hexframe' or 'debughexframe')
}

// ==================== HEXPLAN CONTENT GENERATION ====================

/**
 * Generates hexplan content for a parent tile (tile with subtasks).
 * This is used by the API to create/initialize the hexplan tile before prompting.
 */
export function generateParentHexplanContent(
  structuralChildren: Array<{ title: string; coords: string }>
): string {
  const lines: string[] = []
  lines.push('🟡 STARTED')
  lines.push('')
  lines.push('**Steps:**')
  structuralChildren.forEach((child, index) => {
    lines.push(`📋 ${index + 1}. Execute "${child.title}" → ${child.coords}`)
  })
  lines.push('')
  lines.push('**Progress:**')
  lines.push('(initialized)')
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
  hexPlan: string,
  taskCoords: string,
  hasSubtasks: boolean,
  mcpServerName: string
): string {
  const hexplanCoords = `${taskCoords},0`

  // Check if there are any pending steps (📋)
  const hasPendingSteps = hexPlan.includes('📋')
  const hasBlockedSteps = hexPlan.includes('🔴')

  if (!hasPendingSteps) {
    // No pending steps - task is complete or blocked
    if (hasBlockedSteps) {
      return `<hexplan-status>BLOCKED</hexplan-status>\n<message>Task has blocked steps. Review the hexplan at ${escapeXML(hexplanCoords)} and resolve blockers before continuing.</message>\n\n<hexplan coords="${escapeXML(hexplanCoords)}">\n${escapeXML(hexPlan)}\n</hexplan>`
    }
    return `<hexplan-status>COMPLETE</hexplan-status>\n<message>All steps completed for task at ${escapeXML(taskCoords)}.</message>\n\n<hexplan coords="${escapeXML(hexplanCoords)}">\n${escapeXML(hexPlan)}\n</hexplan>`
  }

  // Hexplan exists with pending steps - show it with execution instructions
  const lines: string[] = []
  lines.push(`<hexplan coords="${escapeXML(hexplanCoords)}">`)
  lines.push(escapeXML(hexPlan))
  lines.push(`</hexplan>`)
  lines.push('')
  lines.push(`<execution-instructions>`)
  lines.push(`Execute the NEXT PENDING STEP (first 📋) from the hexplan above.`)
  lines.push(``)

  if (hasSubtasks) {
    // Parent tile: instructions for spawning subagents
    lines.push(`To execute a step:`)
    lines.push(`1. Call mcp__${mcpServerName}__hexecute with the child's coords to get its prompt`)
    lines.push(`2. Spawn a subagent using the Task tool with the resulting prompt`)
    lines.push(``)
    lines.push(`Example for step "Execute 'Clarify the Task' → userId,0:6,1":`)
    lines.push(`  prompt = mcp__${mcpServerName}__hexecute({ taskCoords: "userId,0:6,1" })`)
    lines.push(`  Task({ subagent_type: "general-purpose", prompt: prompt })`)
    lines.push(``)
    lines.push(`After the subagent completes:`)
  } else {
    // Leaf tile: instructions for direct execution
    lines.push(`Execute the task directly using the <task> content and <context> above.`)
    lines.push(``)
    lines.push(`After completing:`)
  }

  lines.push(`- Update the hexplan at ${escapeXML(hexplanCoords)} using updateItem:`)
  lines.push(`   - Change the step status from 📋 to ✅`)
  lines.push(`   - Add a brief note about what was done`)
  lines.push(`- Return a SHORT summary (1-2 sentences) of what you accomplished`)
  lines.push(``)
  lines.push(`If you cannot complete the step:`)
  lines.push(`- Update the step status to 🔴 BLOCKED with explanation`)
  lines.push(`- Return the blocker so the user can intervene`)
  lines.push(``)
  lines.push(`IMPORTANT: Execute ONLY ONE step, then return. The orchestrator will call you again for the next step.`)
  lines.push(`</execution-instructions>`)

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
  const hasSubtasks = data.structuralChildren.length > 0
  const sections = [
    buildContextSection(data.composedChildren),
    buildSubtasksSection(data.structuralChildren),
    buildTaskSection(data.task),
    buildHexplanSection(data.hexPlan, data.task.coords, hasSubtasks, data.mcpServerName)
  ]

  // Filter empty sections and join with blank lines
  return sections
    .filter(section => section.length > 0)
    .join('\n\n')
}
