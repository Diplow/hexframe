/**
 * HexPlan template.
 *
 * Renders the hexplan section with status-based instructions.
 */

// ==================== PUBLIC TYPES ====================

export type HexPlanStatus = 'pending' | 'complete' | 'blocked'

export interface HexPlanParams {
  mcpServerName: string
  isParentTile: boolean
  taskCoords: string
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

// ==================== INTERNAL TEMPLATES ====================

function _renderBlockedSection(coords: string, content: string): string {
  return `<hexplan-status>BLOCKED</hexplan-status>
<message>Task has blocked steps. Review the hexplan at ${_escapeXML(coords)} and resolve blockers before continuing.</message>

<hexplan coords="${_escapeXML(coords)}">
${content}
</hexplan>`
}

function _renderCompleteSection(coords: string, content: string, taskCoords: string): string {
  return `<hexplan-status>COMPLETE</hexplan-status>
<message>All steps completed for task at ${_escapeXML(taskCoords)}.</message>

<hexplan coords="${_escapeXML(coords)}">
${content}
</hexplan>`
}

function _renderPendingSection(
  coords: string,
  content: string,
  params: HexPlanParams
): string {
  const instructions = params.isParentTile
    ? _renderParentInstructions(coords, params.mcpServerName)
    : _renderLeafInstructions(coords)

  return `<hexplan coords="${_escapeXML(coords)}">
${content}
</hexplan>

<execution-instructions>
Execute the NEXT PENDING STEP (first \uD83D\uDCCB) from the hexplan above.

${instructions}
</execution-instructions>`
}

function _renderParentInstructions(coords: string, mcpServerName: string): string {
  return `To execute a step:
1. Call mcp__${mcpServerName}__hexecute with the child's coords to get its prompt
2. Spawn a subagent using the Task tool with the resulting prompt

Example for step "Execute 'Clarify the Task' → userId,0:6,1":
  prompt = mcp__${mcpServerName}__hexecute({ taskCoords: "userId,0:6,1" })
  Task({ subagent_type: "general-purpose", prompt: prompt })

After the subagent completes:
- Update the hexplan at ${_escapeXML(coords)} using updateItem:
   - Change the step status from \uD83D\uDCCB to \u2705
   - Add a brief note about what was done
- Return a SHORT summary (1-2 sentences) of what you accomplished

If you cannot complete the step:
- Update the step status to \uD83D\uDD34 BLOCKED with explanation
- Return the blocker so the user can intervene

IMPORTANT: Execute ONLY ONE step, then return. The orchestrator will call you again for the next step.`
}

function _renderLeafInstructions(coords: string): string {
  return `Execute the task directly using the <task> content and <context> above.

After completing:
- Update the hexplan at ${_escapeXML(coords)} using updateItem:
   - Change the step status from \uD83D\uDCCB to \u2705
   - Add a brief note about what was done
- Return a SHORT summary (1-2 sentences) of what you accomplished

If you cannot complete the step:
- Update the step status to \uD83D\uDD34 BLOCKED with explanation
- Return the blocker so the user can intervene

IMPORTANT: Execute ONLY ONE step, then return. The orchestrator will call you again for the next step.`
}

// ==================== PUBLIC FUNCTIONS ====================

/**
 * Render the hexplan section based on status.
 *
 * @param coords - Hexplan tile coordinates
 * @param content - Hexplan content
 * @param status - Current hexplan status
 * @param params - Additional parameters for instruction rendering
 * @returns Rendered XML hexplan section
 */
export function HexPlan(
  coords: string,
  content: string,
  status: HexPlanStatus,
  params: HexPlanParams
): string {
  switch (status) {
    case 'blocked':
      return _renderBlockedSection(coords, content)

    case 'complete':
      return _renderCompleteSection(coords, content, params.taskCoords)

    case 'pending':
      return _renderPendingSection(coords, content, params)

    default: {
      const exhaustiveCheck: never = status
      throw new Error(`Unknown hexplan status: ${String(exhaustiveCheck)}`)
    }
  }
}
