/**
 * Public API for Mapping Domain
 * 
 * Consumers: App layer (map pages), tRPC API, Agentic domain
 */

// Domain entities
export { 
  MapItem, 
  BaseItem,
  type MapItemWithId,
  type BaseItemWithId,
  type MapItemAttrs,
  type BaseItemAttrs,
  MapItemType,
} from './_objects';

// Domain services
export { 
  MappingService,
  MapManagementService,
  ItemManagementService,
  ItemCrudService,
  ItemQueryService,
  MappingUtils,
} from './services';

// Repository interfaces (for testing/mocking)
export type {
  MapItemRepository,
  BaseItemRepository,
} from './_repositories';

// Domain types
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

// Domain errors
export {
  MapNotFoundError,
  ItemNotFoundError,
  InvalidCoordinatesError,
  InvalidMoveError,
  PermissionDeniedError,
} from './types/errors';


// Utilities
export {
  type Coord,
  Direction,
  CoordSystem,
  getNeighborCoord,
  isValidCoord,
  coordToString,
  stringToCoord,
} from './utils/hex-coordinates';

// Infrastructure (for service instantiation)
export {
  DbMapItemRepository,
  DbBaseItemRepository,
  TransactionManager,
} from './infrastructure/interface';