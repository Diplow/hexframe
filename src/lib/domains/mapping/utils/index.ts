/**
 * Utils-specific exports for the Mapping Domain
 *
 * Contains utilities for coordinate calculations, spatial operations, and hex geometry.
 */

// Hex coordinate utilities
export {
  type Coord,
  Direction,
  CoordSystem,
  getNeighborCoord,
  isValidCoord,
  coordToString,
  stringToCoord,
  isValidCoordId,
} from '~/lib/domains/mapping/utils/hex-coordinates';

// Context types for AI operations
export {
  type ContextStrategy,
  type MapContext,
  ContextStrategies,
} from '~/lib/domains/mapping/utils/context';

// Re-export commonly needed types from the domain (client-safe API)
// This allows client code to import from utils without pulling in server dependencies
export {
  MapItemType,
  type NonUserMapItemType,
  type NonUserMapItemTypeString,
  type ItemTypeValue,
  Visibility,
  type VisibilityString,
} from '~/lib/domains/mapping/_objects';
export type { UpdateMapItemAttrs as MapItemUpdateAttributes } from '~/lib/domains/mapping/types/parameters';
export type { CreateMapItemParams as MapItemCreateAttributes } from '~/lib/domains/mapping/types/parameters';
export type { MapItemContract } from '~/lib/domains/mapping/types/contracts';
export type { MapItemAttributes } from '~/lib/domains/mapping/types/item-attributes';