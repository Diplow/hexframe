/**
 * Client-Safe API for Mapping Domain
 * 
 * Consumers: Client components, client-side utilities
 * 
 * IMPORTANT: This file MUST NOT export anything that imports server-side code
 */

// Domain entities (client-safe)
export { 
  MapItem, 
  BaseItem,
  type MapItemWithId,
  type BaseItemWithId,
  type MapItemAttrs,
  type BaseItemAttrs,
  MapItemType,
} from './_objects';

// Repository interfaces only (for typing, not implementation)
export type {
  MapItemRepository,
  BaseItemRepository,
} from './_repositories';

// Domain types (client-safe)
export type {
  MapContract,
  MapItemContract,
} from './types/contracts';

export type {
  CreateMapInput,
  CreateItemInput,
  UpdateItemInput,
  MoveItemInput,
  SwapItemsInput,
} from './types';

export {
  mapItemDomainToContractAdapter,
} from './types/contracts';

// Domain errors (client-safe)
export {
  MapNotFoundError,
  ItemNotFoundError,
  InvalidCoordinatesError,
  InvalidMoveError,
  PermissionDeniedError,
} from './types/errors';

// Utilities (client-safe)
export {
  type Coord,
  Direction,
  CoordSystem,
  getNeighborCoord,
  isValidCoord,
  coordToString,
  stringToCoord,
} from './utils/hex-coordinates';