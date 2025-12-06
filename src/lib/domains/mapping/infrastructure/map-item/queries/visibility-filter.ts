import { eq, or, type SQL } from "drizzle-orm";
import { schema as schemaImport } from "~/server/db";
import { Visibility } from "~/lib/domains/mapping/_objects/map-item";
import {
  type RequesterContext,
  isSystemInternal,
} from "~/lib/domains/mapping/types";

const { mapItems } = schemaImport;

/**
 * Builds a visibility filter for read queries.
 *
 * Security logic:
 * - If requester is SYSTEM_INTERNAL: No filter (internal/system operation)
 * - If requester === ownerUserId: No filter (owner sees everything)
 * - If requester !== ownerUserId: Only return public tiles
 *
 * For anonymous/unauthenticated user access, use ANONYMOUS_REQUESTER constant.
 *
 * @param requester - The requester context (RequesterUserId or SYSTEM_INTERNAL)
 * @param ownerUserId - The userId of the tiles being queried (coord_user_id)
 * @returns SQL filter to apply, or undefined if no filter needed
 */
export function buildVisibilityFilter(
  requester: RequesterContext,
  ownerUserId: string
): SQL | undefined {
  // Internal/system operation - no filter needed
  if (isSystemInternal(requester)) {
    return undefined;
  }

  // Owner always sees everything - no filter needed
  if (requester === ownerUserId) {
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
 * @param requester - The requester context (RequesterUserId or SYSTEM_INTERNAL)
 * @returns SQL filter to apply, or undefined if no filter needed (internal operations)
 */
export function buildMultiOwnerVisibilityFilter(
  requester: RequesterContext
): SQL | undefined {
  // Internal/system operation - no filter needed
  if (isSystemInternal(requester)) {
    return undefined;
  }

  // Authenticated user: can see own tiles + public tiles
  if (requester) {
    return or(
      eq(mapItems.coord_user_id, requester),
      eq(mapItems.visibility, Visibility.PUBLIC)
    )!;
  }

  // Anonymous users (empty string): only see public tiles
  return eq(mapItems.visibility, Visibility.PUBLIC);
}
