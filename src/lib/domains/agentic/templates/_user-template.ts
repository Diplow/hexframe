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
 *
 * Uses pool-based dispatch via {{@RenderChildren}} for consistent rendering.
 */

import type { TileData } from '~/lib/domains/agentic/templates/_pre-processor'

/**
 * Data shape expected by the USER template.
 * Uses Mustache variables for non-tile data (discussion, userMessage).
 * Tile data is rendered via {{@RenderChildren}} and accessed via child[direction].
 */
export interface UserTemplateData {
  hasDiscussion: boolean
  discussion: string

  hasUserMessage: boolean
  userMessage: string
}

/**
 * Template context content for USER tiles (composed child at -1).
 * Explains the agent's role as the user's interlocutor.
 */
export const USER_TEMPLATE_CONTEXT = `<user-intro>
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
 * Mustache template for USER tiles with pool-based dispatch.
 * Uses {{@RenderChildren}} for context, sections, and recent-history.
 */
export const USER_TEMPLATE = `{{{template[-1].content}}}

<context>
{{@RenderChildren range=[-6..-1] fallback='context'}}
</context>

<sections>
{{@RenderChildren range=[1..6] fallback='section'}}
</sections>

{{@RenderChildren range=[0..0] fallback='recent-history'}}

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

/**
 * Sub-templates for USER tile pool-based dispatch.
 * These match the tile-based templates at D1i4gEqbi01JWS2F6I7GUN8ekRiU2mjK,0:1,2,2.
 */
export const USER_SUB_TEMPLATES: TileData[] = [
  {
    title: 'organizational',
    content: `<folder title="{{title}}" coords="{{coords}}">
{{@RenderChildren range=[1..6] fallback='context'}}
{{@RenderChildren range=[-6..-1] fallback='context'}}
</folder>`,
    coords: '',
    itemType: 'template',
    direction: 1,
    // Children provide templates for nested rendering inside folders
    children: [
      {
        title: 'context',
        content: `<item title="{{title}}" coords="{{coords}}">
{{content}}
</item>`,
        coords: '',
        itemType: 'template',
        direction: 2
      }
    ]
  },
  {
    title: 'context',
    content: `<context title="{{title}}" coords="{{coords}}">
{{content}}
</context>`,
    coords: '',
    itemType: 'template',
    direction: 2
  },
  {
    title: 'generic',
    content: `<tile coords="{{coords}}">{{title}}</tile>`,
    coords: '',
    itemType: 'template',
    direction: 3
  },
  {
    title: 'section',
    content: `<section title="{{title}}" coords="{{coords}}">
{{preview}}
</section>`,
    coords: '',
    itemType: 'template',
    direction: 4
  },
  {
    title: 'recent-history',
    content: `<recent-history coords="{{coords}}">
This section tracks the user's recent goals and session state. Update it when the user expresses a goal, so future sessions can quickly resume context.

{{content}}
</recent-history>`,
    coords: '',
    itemType: 'template',
    direction: 5
  }
]

// ==================== BACKWARD COMPATIBILITY ====================

/**
 * @deprecated Use USER_TEMPLATE_CONTEXT instead
 */
export const USER_INTRO = USER_TEMPLATE_CONTEXT
