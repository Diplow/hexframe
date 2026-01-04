/**
 * HEXRUN Orchestrator Mustache Template (Internal)
 *
 * This template produces the prompt for orchestrating SYSTEM tile execution
 * when triggered via @-mention in chat. Instead of direct hexecute execution,
 * the agent runs an orchestration loop using MCP tools.
 */

import Mustache from 'mustache'
import { MapItemType } from '~/lib/domains/mapping'

// ==================== PUBLIC TYPES ====================

/**
 * Data shape expected by the HEXRUN_ORCHESTRATOR template.
 */
export interface HexrunOrchestratorTemplateData {
  orchestratorIntro: string
  taskTitle: string
  taskCoords: string
  hasInstruction: boolean
  instruction: string
  mcpServerName: string
  hasDiscussion: boolean
  discussion: string
}

/**
 * Input data for building orchestrator prompts.
 */
export interface OrchestratorPromptInput {
  task: {
    title: string
    coords: string
  }
  mcpServerName: string
  itemType: MapItemType
  userMessage?: string
  discussion?: string
}

/**
 * Static orchestrator introduction text.
 */
export const HEXRUN_ORCHESTRATOR_INTRO = `<hexrun-orchestrator>
You are orchestrating the execution of a SYSTEM tile using the hexrun pattern.

Your job is to execute the task step-by-step using MCP tools until completion or a blocker is encountered.
</hexrun-orchestrator>`

/**
 * Mustache template for HEXRUN orchestration.
 * Uses triple braces {{{value}}} for pre-escaped content.
 */
export const HEXRUN_ORCHESTRATOR_TEMPLATE = `{{{orchestratorIntro}}}

<task-info>
<title>{{{taskTitle}}}</title>
<coords>{{{taskCoords}}}</coords>
{{#hasInstruction}}
<instruction>{{{instruction}}}</instruction>
{{/hasInstruction}}
</task-info>
{{#hasDiscussion}}

<discussion>
Previous messages in this conversation:

{{{discussion}}}
</discussion>
{{/hasDiscussion}}

<execution-protocol>
Execute this loop until complete or blocked:

1. **Get the next step**: Call \`mcp__{{{mcpServerName}}}__hexecute\` with taskCoords="{{{taskCoords}}}"

2. **Check the response**:
   - If \`<hexplan-status>COMPLETE</hexplan-status>\` → Report success to user
   - If \`<hexplan-status>BLOCKED</hexplan-status>\` → Report blocker to user
   - Otherwise → Continue to step 3

3. **Execute the step**: Follow the \`<execution-instructions>\` in the hexecute response.
   The instructions will tell you to execute ONE step (the first pending step in the hexplan).

4. **Update the hexplan**: After completing the step, update the hexplan tile to mark the step as completed or blocked.

5. **Repeat**: Go back to step 1 until complete.

**Important**:
- Execute one step at a time
- Always update the hexplan after each step
- Stop immediately if you encounter a blocker
- Report progress to the user as you go
</execution-protocol>`

// ==================== INTERNAL UTILITIES ====================

function _hasContent(text: string | undefined): boolean {
  return !!text && text.trim().length > 0
}

// ==================== PUBLIC FUNCTIONS ====================

/**
 * Check if we should use the orchestrator template for this request.
 * Use orchestrator for SYSTEM tiles when triggered via @-mention (has userMessage).
 */
export function shouldUseOrchestrator(itemType: MapItemType, userMessage: string | undefined): boolean {
  return itemType === MapItemType.SYSTEM && _hasContent(userMessage)
}

/**
 * Build the HEXRUN orchestrator prompt for SYSTEM tiles triggered via @-mention.
 */
export function buildOrchestratorPrompt(data: OrchestratorPromptInput): string {
  const templateData: HexrunOrchestratorTemplateData = {
    orchestratorIntro: HEXRUN_ORCHESTRATOR_INTRO,
    taskTitle: data.task.title,
    taskCoords: data.task.coords,
    hasInstruction: _hasContent(data.userMessage),
    instruction: data.userMessage ?? '',
    mcpServerName: data.mcpServerName,
    hasDiscussion: _hasContent(data.discussion),
    discussion: data.discussion ?? ''
  }

  const rendered = Mustache.render(HEXRUN_ORCHESTRATOR_TEMPLATE, templateData)

  return rendered
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n\n$/g, '')
    .trim()
}
