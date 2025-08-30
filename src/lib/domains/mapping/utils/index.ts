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
} from '../_objects';

// Repository interfaces only (for typing, not implementation)
export type {
  MapItemRepository,
  MapItemIdr,
  BaseItemRepository,
} from '../_repositories';

// Domain types (client-safe)
export type {
  MapContract,
  MapItemContract,
} from '../types/contracts';

export type {
  CreateMapInput,
  CreateItemInput,
  UpdateItemInput,
  MoveItemInput,
  SwapItemsInput,
  DatabaseTransaction,
} from '../types';

export {
  mapItemDomainToContractAdapter,
} from '../types/contracts';

// Domain errors (client-safe)
export {
  MapNotFoundError,
  ItemNotFoundError,
  InvalidCoordinatesError,
  InvalidMoveError,
  PermissionDeniedError,
} from '../types/errors';

// Utilities (client-safe)
export {
  type Coord,
  Direction,
  CoordSystem,
  getNeighborCoord,
  isValidCoord,
  coordToString,
  stringToCoord,
} from '../utils/hex-coordinates';

// Note: GenericAggregate and GenericRepository are imported directly from '../../utils'
// to avoid circular dependencies since _objects imports from this file