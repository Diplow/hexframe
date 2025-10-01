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
} from '~/lib/domains/mapping/utils/hex-coordinates';

// MapItem attribute types (canonical source of truth)
export type {
  MapItemAttributes,
  MapItemUpdateAttributes,
  MapItemCreateAttributes,
} from '../types/item-attributes';