/**
 * Shared types for prompt building.
 */

import type { MapItemType } from '~/lib/domains/mapping'

export interface PromptDataTile {
  title: string
  content?: string
  preview?: string
  coords: string
  itemType?: MapItemType
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
    itemType?: MapItemType
  }>
  composedChildren: Array<PromptDataTile>
  structuralChildren: Array<PromptDataTile>
  hexPlan: string
  mcpServerName: string
  allLeafTasks?: Array<{
    title: string
    coords: string
  }>
  itemType: MapItemType
  /** For USER tiles: the current discussion/conversation state */
  discussion?: string
  /** For USER tiles: the user's current message/instruction */
  userMessage?: string
}
