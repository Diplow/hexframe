import {
  type RequesterUserId,
  asRequesterUserId,
  ANONYMOUS_REQUESTER,
} from "~/lib/domains/mapping";
import { _requireAuth } from "~/server/api/routers/_error-helpers";

export function _getUserId(user: unknown): string {
  _requireAuth(user);
  return user.id;
}

export function _getUserName(user: unknown): string {
  _requireAuth(user);
  return user.name ?? user.email ?? "User";
}

/**
 * Get a RequesterUserId from user session context.
 * Returns ANONYMOUS_REQUESTER for unauthenticated users.
 *
 * This is the primary way to create a RequesterUserId for visibility filtering
 * in API routes.
 */
export function _getRequesterUserId(
  user: { id: string } | null | undefined
): RequesterUserId {
  return user?.id ? asRequesterUserId(user.id) : ANONYMOUS_REQUESTER;
}

export function _createSuccessResponse<T = Record<string, unknown>>(
  data?: T,
): { success: true } & T {
  return { success: true, ...data } as { success: true } & T;
}

export function _createErrorResponse<T = Record<string, unknown>>(
  error: string,
  data?: T,
): { success: false; error: string } & T {
  return { success: false, error, ...data } as {
    success: false;
    error: string;
  } & T;
}
