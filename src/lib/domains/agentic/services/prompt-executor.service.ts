/**
 * Hexframe Prompt Builder v2 - Recursive Execution
 *
 * Generates execution-ready prompts from tile hierarchies following HEXFRAME_PROMPT.md spec.
 * Each section function reads like the XML template it generates.
 *
 * Key changes from v1:
 * - Execution history moved to systematic subtasks (read/write)
 * - Hexframe philosophy always included in context
 * - Subtasks have coords attributes for recursive hexecute calls
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
  }>
  structuralChildren: Array<{
    title: string
    preview: string | undefined
    coords: string
  }>
  instruction: string | undefined
  mcpServerName: string // e.g., 'hexframe', 'debughexframe'
  ancestorHistories: Array<{
    coords: string
    content: string
  }> // Execution histories from parent chain (root to immediate parent)
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

function buildContextSection(
  composedChildren: PromptData['composedChildren'],
  mcpServerName: string,
  taskCoords: string
): string {
  const sections: string[] = []

  // Always include Hexframe philosophy
  sections.push(buildHexframePhilosophy(mcpServerName, taskCoords))

  // Add user-provided composed children
  const validChildren = composedChildren.filter(child => hasContent(child.content))
  for (const child of validChildren) {
    sections.push(`${escapeXML(child.title)}\n\n${escapeXML(child.content)}`)
  }

  return `<context>\n${sections.join('\n\n')}\n</context>`
}

function buildHexframePhilosophy(mcpServerName: string, taskCoords: string): string {
  const historyCoords = `${taskCoords},0`
  return `# Hexframe Orchestration

This prompt was generated from a Hexframe tile hierarchy.

**IMPORTANT:** You should have access to the ${mcpServerName} MCP. If you don't, stop here and escalate to the user - you cannot execute this task without it.

**Your Execution History:** ${historyCoords}
This is where you track progress. Write to it after EACH subtask (not all at once at the end).

**Subtask Execution Pattern:**
For each subtask marked with subagent="true":
1. Call ${mcpServerName}:hexecute(subtask_coords, 'read relevant context from parent execution history')
2. The response is a prompt - spawn a subagent and give it that prompt to execute as its own task
3. The subagent updates its own execution history (at subtask_coords,0)
4. YOU update YOUR execution history (${historyCoords}) with:
   - ✅ Subtask [N] complete: [brief summary]
   - Created/updated tiles: [coords only, don't copy full content]
   - Next subtask needs: [brief context]

For subtasks marked with subagent="false":
- Execute the task yourself directly (no subagent spawning)

**Key Points:**
- Do NOT include subtask context in your conversation - subagents fetch what they need
- Do NOT read tiles created by subtasks unless you specifically need them
- Document tile coords in your history, not content (keeps context clean)
- Subagents update their own history - you update yours
- Update YOUR history progressively (after each subtask), not at the end`
}

function buildSubtasksSection(
  structuralChildren: PromptData['structuralChildren'],
  taskCoords: string,
  mcpServerName: string,
  ancestorHistories: PromptData['ancestorHistories'],
  taskTitle: string,
  instruction: string | undefined
): string {
  const subtasks: string[] = []

  // Systematic subtask 1: Read execution history
  subtasks.push(buildReadHistorySubtask(taskCoords, mcpServerName, ancestorHistories, taskTitle, instruction, structuralChildren))

  // User-defined subtasks
  for (const child of structuralChildren) {
    const preview = child.preview ?? ''
    subtasks.push(
      `<subtask coords="${escapeXML(child.coords)}" subagent="true">\n<title>${escapeXML(child.title)}</title>\n${escapeXML(preview)}\n</subtask>`
    )
  }

  // Systematic subtask N: Mark task complete
  subtasks.push(buildMarkDoneSubtask())

  return `<subtasks>\n${subtasks.join('\n\n')}\n</subtasks>`
}

function buildReadHistorySubtask(
  taskCoords: string,
  mcpServerName: string,
  ancestorHistories: PromptData['ancestorHistories'],
  taskTitle: string,
  instruction: string | undefined,
  structuralChildren: PromptData['structuralChildren']
): string {
  const historyCoords = `${taskCoords},0`
  const sections: string[] = []

  sections.push(`<subtask coords="${escapeXML(historyCoords)}" subagent="false">`)
  sections.push(`<title>Read Execution History</title>`)

  // Include ancestor histories if any
  if (ancestorHistories.length > 0) {
    sections.push(`\n<parent-context>`)
    for (const ancestor of ancestorHistories) {
      sections.push(`From ${escapeXML(ancestor.coords)}:`)
      sections.push(escapeXML(ancestor.content))
      sections.push('')
    }
    sections.push(`</parent-context>`)
  }

  sections.push(`\n<instructions>`)
  sections.push(`1. Call ${escapeXML(mcpServerName)}:getItemByCoords({coords: "${escapeXML(historyCoords)}"})`)
  sections.push(`2. If it exists:`)
  sections.push(`   - Review what's been done and what's next`)
  sections.push(`   - VALIDATE: If history references tiles (e.g., "clarification at coords X"), verify they exist`)
  sections.push(`   - If inconsistencies found (missing tiles, broken refs): STOP and escalate to user`)
  sections.push(`3. If it doesn't exist (first execution):`)

  // Build initial execution history content
  const initialContent = buildInitialHistoryContent(taskTitle, instruction, structuralChildren)
  sections.push(`   - Create it: ${escapeXML(mcpServerName)}:addItem({coords: "${escapeXML(historyCoords)}", title: "Execution History", content: ${escapeXML(JSON.stringify(initialContent))}})`)
  sections.push(`   - Then proceed with subtasks`)
  sections.push(`</instructions>`)
  sections.push(`</subtask>`)

  return sections.join('\n')
}

function buildInitialHistoryContent(
  taskTitle: string,
  instruction: string | undefined,
  structuralChildren: PromptData['structuralChildren']
): string {
  const lines: string[] = []

  lines.push(`🟡 STARTED [${new Date().toISOString()}]: Beginning execution of "${taskTitle}"`)
  lines.push('')

  if (hasContent(instruction)) {
    lines.push('**Initial Instructions:**')
    lines.push(instruction!)
    lines.push('')
  }

  lines.push('**Execution Plan:**')
  structuralChildren.forEach((child, index) => {
    lines.push(`${index + 1}. 📋 TODO: ${child.title} (${child.coords})`)
  })

  return lines.join('\n')
}

function buildMarkDoneSubtask(): string {
  return `<subtask subagent="false">
<title>Mark Task Complete</title>
<instructions>
After completing all subtasks, update your execution history (direction 0) with final status:
- ✅ COMPLETED [timestamp]: [overall summary]
- All subtasks completed successfully
- Final outcome: [what was delivered]

Note: You should have already documented each subtask's results progressively (after each one), not all at once here.
</instructions>
</subtask>`
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

function buildInstructionsSection(instruction: string | undefined): string {
  if (!hasContent(instruction)) {
    return ''
  }

  return `<instructions>\n${escapeXML(instruction!)}\n</instructions>`
}

// ==================== MAIN BUILDER ====================

/**
 * Builds execution-ready XML prompt from task data.
 *
 * Template structure (HEXFRAME_PROMPT.md v2):
 * 1. <context> - Hexframe philosophy + Composed children title + content
 * 2. <subtasks> - Read history + User subtasks + Mark done
 * 3. <task> - Goal + content
 * 4. <instructions> - User instructions (optional)
 *
 * Sections with no data are omitted (except context and subtasks, always present).
 * Sections are separated by blank lines.
 */
export function buildPrompt(data: PromptData): string {
  const sections = [
    buildContextSection(data.composedChildren, data.mcpServerName, data.task.coords),
    buildSubtasksSection(data.structuralChildren, data.task.coords, data.mcpServerName, data.ancestorHistories, data.task.title, data.instruction),
    buildTaskSection(data.task),
    buildInstructionsSection(data.instruction)
  ]

  // Filter empty sections and join with blank lines
  return sections
    .filter(section => section.length > 0)
    .join('\n\n')
}
