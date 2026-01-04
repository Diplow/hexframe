/**
 * Template registry module.
 *
 * Exports all template functions and the registry interface.
 */

import type { TileData } from '~/lib/domains/agentic/templates/_pre-processor'
import { GenericTile } from '~/lib/domains/agentic/templates/_templates/_generic-tile'
import { Folder } from '~/lib/domains/agentic/templates/_templates/_folder'
import { TileOrFolder } from '~/lib/domains/agentic/templates/_templates/_tile-or-folder'
import { HexPlan, type HexPlanStatus, type HexPlanParams } from '~/lib/domains/agentic/templates/_templates/_hexplan'

// ==================== PUBLIC TYPES ====================

export interface TemplateRegistry {
  GenericTile: (
    tile: TileData | undefined,
    fields: string[],
    wrapper?: string
  ) => string

  Folder: (
    tile: TileData | undefined,
    fields: string[],
    depth: number
  ) => string

  TileOrFolder: (
    tile: TileData | undefined,
    fields: string[],
    wrapper: string | undefined,
    depth: number
  ) => string

  HexPlan: (
    coords: string,
    content: string,
    status: HexPlanStatus,
    params: HexPlanParams
  ) => string
}

// ==================== PUBLIC EXPORTS ====================

export { GenericTile } from '~/lib/domains/agentic/templates/_templates/_generic-tile'
export type { TileField } from '~/lib/domains/agentic/templates/_templates/_generic-tile'

export { Folder } from '~/lib/domains/agentic/templates/_templates/_folder'

export { TileOrFolder } from '~/lib/domains/agentic/templates/_templates/_tile-or-folder'

export { HexPlan } from '~/lib/domains/agentic/templates/_templates/_hexplan'
export type { HexPlanStatus, HexPlanParams } from '~/lib/domains/agentic/templates/_templates/_hexplan'

/**
 * Default template registry with all available templates.
 */
export const templateRegistry: TemplateRegistry = {
  GenericTile,
  Folder,
  TileOrFolder,
  HexPlan
}
