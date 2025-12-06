/**
 * Security types for visibility filtering.
 *
 * These branded types ensure that requesterUserId is always explicitly provided
 * to repository methods, preventing accidental bypass of visibility checks.
 *
 * Three modes of access:
 * 1. RequesterUserId (branded string) - User-initiated request with visibility filtering
 * 2. ANONYMOUS_REQUESTER - Unauthenticated user, sees only public tiles
 * 3. SYSTEM_INTERNAL - Internal/system operations that bypass visibility checks
 */

/**
 * Branded type for requester user ID - forces explicit creation.
 *
 * This type cannot be created from a raw string without using the helper
 * functions, ensuring visibility filtering is always intentional.
 */
export type RequesterUserId = string & { readonly __brand: "RequesterUserId" };

/**
 * Sentinel type for internal/system operations that bypass visibility filtering.
 *
 * Use SYSTEM_INTERNAL constant when:
 * - Validating visibility inheritance (needs to see private ancestors)
 * - Background jobs that need full access
 * - Internal system operations
 *
 * SECURITY: Using this bypasses all visibility checks. Only use when necessary.
 */
export type SystemInternal = typeof SYSTEM_INTERNAL;

/**
 * Union type for all requester contexts.
 * - RequesterUserId: Authenticated user (sees own + public)
 * - SystemInternal: Internal operations (sees all)
 */
export type RequesterContext = RequesterUserId | SystemInternal;

/**
 * Create a RequesterUserId from an authenticated user's ID.
 *
 * @param userId - The authenticated user's ID from session
 * @returns A branded RequesterUserId for visibility filtering
 */
export function asRequesterUserId(userId: string): RequesterUserId {
  return userId as RequesterUserId;
}

/**
 * Anonymous requester constant - for public-only access.
 *
 * Use this when the user is not authenticated. Repository queries will
 * only return public tiles when this is passed.
 */
export const ANONYMOUS_REQUESTER: RequesterUserId = "" as RequesterUserId;

/**
 * System internal constant - bypasses visibility filtering.
 *
 * SECURITY WARNING: Only use for internal operations that legitimately need
 * to bypass visibility checks (e.g., validating visibility inheritance).
 */
export const SYSTEM_INTERNAL = Symbol.for("SYSTEM_INTERNAL");

/**
 * Type guard to check if requester is a system internal operation.
 */
export function isSystemInternal(
  requester: RequesterContext
): requester is SystemInternal {
  return requester === SYSTEM_INTERNAL;
}

/**
 * Type guard to check if a value is a valid RequesterUserId.
 */
export function isRequesterUserId(value: unknown): value is RequesterUserId {
  return typeof value === "string";
}
