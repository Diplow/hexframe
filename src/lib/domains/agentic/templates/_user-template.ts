/**
 * USER Tile Mustache Template (Internal)
 *
 * This template produces the XML prompt structure for USER tiles.
 * USER tiles represent the user's root - the default interlocutor.
 *
 * Key differences from SYSTEM template:
 * - No ancestors (USER tiles are root by definition)
 * - No subtasks/goal (children are sections to explore, not tasks to execute)
 * - Uses "recent history" instead of hexplan for session continuity
 * - Includes discussion section for exchange state
 */

/**
 * Data shape expected by the USER template.
 */
export interface UserTemplateData {
  userIntro: string

  hasComposedChildren: boolean
  contextSection: string

  hasSections: boolean
  sectionsSection: string

  hasRecentHistory: boolean
  recentHistory: string
  recentHistoryCoords: string

  hasDiscussion: boolean
  discussion: string

  hasUserMessage: boolean
  userMessage: string
}

/**
 * Static introduction text for USER tiles.
 * Explains the agent's role as the user's interlocutor.
 */
export const USER_INTRO = `<user-intro>
You are the default interlocutor for a Hexframe user. Your role is to help the user accomplish what they want to do with Hexframe.

Hexframe is a hexagonal knowledge mapping system where users organize their thoughts, plans, and reference materials as interconnected tiles. You can help users:
- Navigate and understand their tile map
- Create, update, or reorganize tiles
- Execute tasks defined in SYSTEM tiles
- Find information in their knowledge base

The sections below show the user's available tiles. ORGANIZATIONAL tiles (marked as folders) group related items. You can explore deeper into any section by using the hexecute tool with the tile's coordinates.

If the user has expressed a goal in a previous session, check the <recent-history> section to quickly catch up on context.
</user-intro>`

/**
 * Mustache template for USER tiles.
 * Uses triple braces {{{value}}} for pre-escaped content.
 */
export const USER_TEMPLATE = `{{{userIntro}}}
{{#hasComposedChildren}}

{{{contextSection}}}
{{/hasComposedChildren}}
{{#hasSections}}

{{{sectionsSection}}}
{{/hasSections}}
{{#hasRecentHistory}}

<recent-history coords="{{{recentHistoryCoords}}}">
This section tracks the user's recent goals and session state. Update it when the user expresses a goal, so future sessions can quickly resume context.

{{{recentHistory}}}
</recent-history>
{{/hasRecentHistory}}
{{#hasDiscussion}}

<discussion>
Previous messages in this conversation:

{{{discussion}}}
</discussion>
{{/hasDiscussion}}
{{#hasUserMessage}}

<user-message>
The user's current message that you need to respond to:

{{{userMessage}}}
</user-message>
{{/hasUserMessage}}`
