import { eq, or, type SQL } from "drizzle-orm";
import { schema as schemaImport } from "~/server/db";
import { Visibility } from "~/lib/domains/mapping/_objects/map-item";

const { mapItems } = schemaImport;

/**
 * Builds a visibility filter for read queries.
 *
 * Security logic:
 * - If requesterUserId is undefined: No filter (internal/system operation)
 * - If requesterUserId === ownerUserId: No filter (owner sees everything)
 * - If requesterUserId !== ownerUserId: Only return public tiles
 *
 * For anonymous/unauthenticated user access, pass empty string "" as requesterUserId.
 *
 * @param requesterUserId - The user making the request (undefined for internal operations, "" for anonymous)
 * @param ownerUserId - The userId of the tiles being queried (coord_user_id)
 * @returns SQL filter to apply, or undefined if no filter needed
 */
export function buildVisibilityFilter(
  requesterUserId: string | undefined,
  ownerUserId: string
): SQL | undefined {
  // Internal/system operation - no filter needed
  if (requesterUserId === undefined) {
    return undefined;
  }

  // Owner always sees everything - no filter needed
  if (requesterUserId === ownerUserId) {
    return undefined;
  }

  // Non-owner or anonymous: only return public tiles
  return eq(mapItems.visibility, Visibility.PUBLIC);
}

/**
 * Builds a visibility filter that checks either:
 * 1. The tile belongs to the requester (owner always sees all)
 * 2. The tile is public
 *
 * This variant is for queries that may return tiles from multiple owners.
 *
 * @param requesterUserId - The user making the request (undefined for internal operations, "" for anonymous)
 * @returns SQL filter to apply, or undefined if no filter needed (internal operations)
 */
export function buildMultiOwnerVisibilityFilter(
  requesterUserId: string | undefined
): SQL | undefined {
  // Internal/system operation - no filter needed
  if (requesterUserId === undefined) {
    return undefined;
  }

  // Authenticated user: can see own tiles + public tiles
  if (requesterUserId) {
    return or(
      eq(mapItems.coord_user_id, requesterUserId),
      eq(mapItems.visibility, Visibility.PUBLIC)
    )!;
  }

  // Anonymous users (empty string): only see public tiles
  return eq(mapItems.visibility, Visibility.PUBLIC);
}
