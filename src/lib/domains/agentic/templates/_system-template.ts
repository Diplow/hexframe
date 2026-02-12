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
Execute this task. Track progress in the hexplan below. When done: \`<status>{"result": "completed"}</status>\`. When blocked: \`<status>{"result": "blocked", "reason": "..."}</status>\`
</execution-instructions>`

/**
 * Mustache template for SYSTEM tiles.
 * Uses triple braces {{{value}}} for pre-escaped content.
 * The {{@HexPlan}} tag is expanded by the pre-processor before Mustache.
 *
 * Structure (optimized for agent context):
 * 1. Execution instructions (general guidance)
 * 2. Hexrun intro
 * 3. Execution context (if blocked)
 * 4. Ancestor context
 * 5. Context section
 * 6. Subtasks section
 * 7. Task
 * 8. Hexplan (most relevant for immediate action)
 */
export const SYSTEM_TEMPLATE = `${EXECUTION_INSTRUCTIONS_SECTION}

{{{hexrunIntro}}}
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

{{@HexPlan}}`

/**
 * Static hexrun introduction text.
 */
export const HEXRUN_INTRO = `<hexrun-intro>This is a HEXRUN - check the hexplan for prior progress and user feedback.</hexrun-intro>`

/**
 * Ancestor context introduction text.
 */
export const ANCESTOR_INTRO = `This task is part of a larger goal. The following ancestor tiles provide context (from root to parent):`
