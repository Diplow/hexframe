/**
 * SYSTEM Tile Mustache Template (Internal)
 *
 * This template produces the XML prompt structure for SYSTEM tiles.
 * Uses a "pre-rendered section" approach for exact whitespace control.
 * The {{@HexPlan}} tag is expanded by the pre-processor.
 */

/**
 * Data shape expected by the SYSTEM template.
 * Pre-computed helper flags and pre-rendered sections for mustache evaluation.
 */
export interface SystemTemplateData {
  hexrunIntro: string

  hasAncestorsWithContent: boolean
  ancestorContextSection: string

  hasComposedChildren: boolean
  contextSection: string

  hasSubtasks: boolean
  subtasksSection: string

  task: {
    title: string
    hasContent: boolean
    content: string
  }

  // Simplified HexPlan (for tile-based templates)
  hasHexplan: boolean
  hexplanCoords: string
  hexPlan: string

  // Execution context for resumed runs
  wasBlocked: boolean
  blockageReason: string
}

/**
 * Execution context section - shown when resuming from a blocked state.
 */
export const EXECUTION_CONTEXT_SECTION = `{{#wasBlocked}}
<execution-context>
<previous-blockage>
This task was previously blocked with reason: {{{blockageReason}}}
The blocker has been addressed. Continue execution from where you left off.
</previous-blockage>
</execution-context>
{{/wasBlocked}}`

/**
 * Execution instructions section - guides agents on completion reporting.
 */
export const EXECUTION_INSTRUCTIONS_SECTION = `<execution-instructions>
Execute this task to completion.

**Planning**: If you need to track multi-step progress:
1. Create a hexplan tile at direction-0 with your plan
2. Update the hexplan as you complete steps

**CRITICAL - Blocking Protocol**:
When you need to block for user input (validation, review, feedback):
1. FIRST persist your work-in-progress in the hexplan tile at direction-0
2. Format work-in-progress as: \`**Proposed:**\` followed by the content
3. THEN return blocked status with reason explaining what you need from user

This ensures the user can SEE what you produced before providing feedback.
Example: If crafting a preview, save the preview text in hexplan, THEN block.

**Completion**: When done, end your response with a status block:
- Success: \`<status>{"result": "completed"}</status>\`
- Blocked: \`<status>{"result": "blocked", "reason": "description"}</status>\`

The status block is REQUIRED for proper orchestration.
</execution-instructions>`

/**
 * Mustache template for SYSTEM tiles.
 * Uses triple braces {{{value}}} for pre-escaped content.
 * The {{@HexPlan}} tag is expanded by the pre-processor before Mustache.
 */
export const SYSTEM_TEMPLATE = `{{{hexrunIntro}}}
{{#wasBlocked}}

${EXECUTION_CONTEXT_SECTION}
{{/wasBlocked}}
{{#hasAncestorsWithContent}}

{{{ancestorContextSection}}}
{{/hasAncestorsWithContent}}
{{#hasComposedChildren}}

{{{contextSection}}}
{{/hasComposedChildren}}
{{#hasSubtasks}}

{{{subtasksSection}}}
{{/hasSubtasks}}

<task>
<goal>{{{task.title}}}</goal>
{{#task.hasContent}}
{{{task.content}}}
{{/task.hasContent}}
</task>

{{@HexPlan}}

${EXECUTION_INSTRUCTIONS_SECTION}`

/**
 * Static hexrun introduction text.
 */
export const HEXRUN_INTRO = `<hexrun-intro>
This prompt was generated from Hexframe tiles. You are executing a HEXRUN - an iterative execution loop where:
- The same tile may be executed multiple times across hexruns
- The hexplan evolves between hexruns with feedback and progress updates
- If the hexplan contains "Feedback from last HEXRUN:" notes, incorporate that guidance
</hexrun-intro>`

/**
 * Ancestor context introduction text.
 */
export const ANCESTOR_INTRO = `This task is part of a larger goal. The following ancestor tiles provide context (from root to parent):`
