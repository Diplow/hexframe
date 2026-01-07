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
}

/**
 * Mustache template for SYSTEM tiles.
 * Uses triple braces {{{value}}} for pre-escaped content.
 * The {{@HexPlan}} tag is expanded by the pre-processor before Mustache.
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

{{@HexPlan}}`

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
