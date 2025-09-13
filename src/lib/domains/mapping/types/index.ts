// Types are now exported directly from their original locations
// For MapItem types, import from: ~/lib/domains/mapping/_objects
// For contracts, use: ~/lib/domains/mapping/types/contracts
// For client-safe API, use: ~/lib/domains/mapping/interface.client

export {
  type MapContract as MapMappingContract,
  type MapItemContract as MapItemMappingContract,
} from "~/lib/domains/mapping/types/contracts";

export type { DatabaseTransaction } from "~/lib/domains/mapping/types/transaction";

// Input types for operations
export interface CreateMapInput {
  title: string;
  descr: string;
  userId: number;
  groupId?: number;
}

export interface CreateItemInput {
  title: string;
  descr: string;
  link?: string;
  parentCoords: string;
}

export interface UpdateItemInput {
  id: number;
  title?: string;
  descr?: string;
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
