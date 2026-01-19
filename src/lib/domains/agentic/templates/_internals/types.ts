/**
 * Shared types for prompt building.
 */

import type { ItemTypeValue } from '~/lib/domains/mapping'

export interface PromptDataTile {
  title: string
  content?: string
  preview?: string
  coords: string
  itemType?: ItemTypeValue
  direction?: number  // -6 to 6, for child lookup by direction
  children?: PromptDataTile[]
}

export interface PromptData {
  task: {
    title: string
    content: string | undefined
    coords: string
  }
  /** Ancestors from root to parent - content flows top-down */
  ancestors: Array<{
    title: string
    content: string | undefined
    coords: string
    itemType?: ItemTypeValue
  }>
  composedChildren: Array<PromptDataTile>
  structuralChildren: Array<PromptDataTile>
  hexPlan: string
  mcpServerName: string
  allLeafTasks?: Array<{
    title: string
    coords: string
  }>
  itemType: ItemTypeValue
  /** For USER tiles: the current discussion/conversation state */
  discussion?: string
  /** For USER tiles: the user's current message/instruction */
  userMessage?: string
}
