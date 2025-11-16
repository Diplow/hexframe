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

// MapItem attribute types (canonical source of truth)
export type {
  MapItemAttributes,
  MapItemUpdateAttributes,
  MapItemCreateAttributes,
} from '~/lib/domains/mapping/types/item-attributes';

// MapItem type enum
export { MapItemType } from '~/lib/domains/mapping/_objects';

// Context types for AI operations
export {
  type ContextStrategy,
  type MapContext,
  ContextStrategies,
} from '~/lib/domains/mapping/utils/context';

// Contract types for API boundaries
export type {
  MapItemContract,
  MapContract,
  BaseItemContract,
} from '~/lib/domains/mapping/types/contracts';