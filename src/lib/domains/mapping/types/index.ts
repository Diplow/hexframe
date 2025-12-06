// Types are now exported directly from their original locations
// For MapItem types, import from: ~/lib/domains/mapping/_objects
// For contracts, use: ~/lib/domains/mapping/types/contracts
// For client-safe API, use: ~/lib/domains/mapping/utils

export {
  type MapContract as MapMappingContract,
  type MapItemContract as MapItemMappingContract,
} from "~/lib/domains/mapping/types/contracts";

// Security types for visibility filtering
export {
  type RequesterUserId,
  type SystemInternal,
  type RequesterContext,
  asRequesterUserId,
  ANONYMOUS_REQUESTER,
  SYSTEM_INTERNAL,
  isSystemInternal,
  isRequesterUserId,
} from "~/lib/domains/mapping/types/requester";

export type { DatabaseTransaction } from "~/lib/domains/mapping/types/transaction";

// Note: These are internal types used within the mapping domain
// They are not exported from the main index.ts
export {
  type CreateMapItemParams,
  type UpdateMapItemAttrs,
  CreateMapItemParamsSchema,
  UpdateMapItemAttrsSchema,
  validateCreateMapItemParams,
  validateUpdateMapItemAttrs,
} from "~/lib/domains/mapping/types/parameters";

// Input types for operations
export interface CreateMapInput {
  title: string;
  content: string;
  userId: number;
  groupId?: number;
}

export interface CreateItemInput {
  title: string;
  content: string;
  link?: string;
  parentCoords: string;
}

export interface UpdateItemInput {
  id: number;
  title?: string;
  content?: string;
  link?: string;
}

export interface MoveItemInput {
  itemId: number;
  targetCoords: string;
}

export interface SwapItemsInput {
  sourceItemId: number;
  targetItemId: number;
}
