import { CoordSystem, type Coord } from "~/lib/domains/mapping/utils";

/**
 * Validates and parses a coordinate ID
 * Returns null if the coordinate is invalid or cannot be used for API calls
 */
export function _validateAndParseCoordinate(
  centerCoordId: string
): Coord | null {
  let coords: Coord;

  try {
    coords = CoordSystem.parseId(centerCoordId);
  } catch (_error) {
    console.warn('Invalid coordinate ID:', _error);
    return null;
  }

  // Don't make API calls with invalid userId/groupId values
  if (coords.userId === 0 || isNaN(coords.userId)) {
    console.warn('[ServerService] Skipping API call due to invalid coordinate parsing:', {
      centerCoordId,
      parsedCoords: coords,
      issue: isNaN(coords.userId) ? 'NaN userId (likely database ID format)' : 'Zero userId'
    });
    return null;
  }

  return coords;
}
