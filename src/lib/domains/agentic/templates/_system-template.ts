/**
 * SYSTEM Tile Mustache Template (Internal)
 *
 * This template produces the XML prompt structure for SYSTEM tiles.
 * Uses a "pre-rendered section" approach for exact whitespace control.
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

  hexplanPending: boolean
  hexplanComplete: boolean
  hexplanBlocked: boolean

  hexplanCoords: string
  hexPlan: string
  taskCoords: string

  isParentTile: boolean
  mcpServerName: string
}

/**
 * Mustache template for SYSTEM tiles.
 * Uses triple braces {{{value}}} for pre-escaped content.
 */
export const SYSTEM_TEMPLATE = `{{{hexrunIntro}}}
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

{{#hexplanBlocked}}
<hexplan-status>BLOCKED</hexplan-status>
<message>Task has blocked steps. Review the hexplan at {{{hexplanCoords}}} and resolve blockers before continuing.</message>

<hexplan coords="{{{hexplanCoords}}}">
{{{hexPlan}}}
</hexplan>
{{/hexplanBlocked}}
{{#hexplanComplete}}
<hexplan-status>COMPLETE</hexplan-status>
<message>All steps completed for task at {{{taskCoords}}}.</message>

<hexplan coords="{{{hexplanCoords}}}">
{{{hexPlan}}}
</hexplan>
{{/hexplanComplete}}
{{#hexplanPending}}
<hexplan coords="{{{hexplanCoords}}}">
{{{hexPlan}}}
</hexplan>

<execution-instructions>
Execute the NEXT PENDING STEP (first 📋) from the hexplan above.

{{#isParentTile}}
To execute a step:
1. Call mcp__{{mcpServerName}}__hexecute with the child's coords to get its prompt
2. Spawn a subagent using the Task tool with the resulting prompt

Example for step "Execute 'Clarify the Task' → userId,0:6,1":
  prompt = mcp__{{mcpServerName}}__hexecute({ taskCoords: "userId,0:6,1" })
  Task({ subagent_type: "general-purpose", prompt: prompt })

After the subagent completes:
{{/isParentTile}}
{{^isParentTile}}
Execute the task directly using the <task> content and <context> above.

After completing:
{{/isParentTile}}
- Update the hexplan at {{{hexplanCoords}}} using updateItem:
   - Change the step status from 📋 to ✅
   - Add a brief note about what was done
- Return a SHORT summary (1-2 sentences) of what you accomplished

If you cannot complete the step:
- Update the step status to 🔴 BLOCKED with explanation
- Return the blocker so the user can intervene

IMPORTANT: Execute ONLY ONE step, then return. The orchestrator will call you again for the next step.
</execution-instructions>
{{/hexplanPending}}`

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
