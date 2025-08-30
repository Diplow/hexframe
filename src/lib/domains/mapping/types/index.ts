export {
  type MapItem as MapItemMappingDomainType,
  MapItemType,
  type MapItemAttrs,
  type MapItemRelatedItems,
  type MapItemRelatedLists,
  type MapItemWithId,
} from "../_objects";

export {
  type MapContract as MapMappingContract,
  type MapItemContract as MapItemMappingContract,
} from "./contracts";

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
