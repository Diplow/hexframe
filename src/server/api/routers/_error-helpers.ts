import { TRPCError } from "@trpc/server";
import type { TRPC_ERROR_CODE_KEY } from "@trpc/server/rpc";

interface AuthUser {
  id: string;
  name?: string;
  email?: string;
}

// =============================================================================
// Authentication Helpers
// =============================================================================

/**
 * Asserts that user is authenticated. Throws UNAUTHORIZED if not.
 * @example _requireAuth(ctx.user);
 */
export function _requireAuth(user: unknown): asserts user is AuthUser {
  if (!user || typeof user !== "object") {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  const authUser = user as Record<string, unknown>;
  if (!authUser.id || typeof authUser.id !== "string") {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid user format" });
  }
}

/**
 * Asserts that a service is configured. Throws BAD_REQUEST if not.
 * @example _requireConfigured(agenticService.isConfigured(), "OPENROUTER_API_KEY or ANTHROPIC_API_KEY");
 */
export function _requireConfigured(isConfigured: boolean, envVarName: string): void {
  if (!isConfigured) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `API key not configured. Please set ${envVarName} environment variable.`,
    });
  }
}

// =============================================================================
// Authorization Helpers
// =============================================================================

/**
 * Asserts that user owns the resource. Throws FORBIDDEN if not.
 * @example _requireOwnership(item.ownerId, currentUserId, "delete items");
 */
export function _requireOwnership(ownerId: string, userId: string, action: string): void {
  if (ownerId !== userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You can only ${action} you own`,
    });
  }
}

// =============================================================================
// Resource Helpers
// =============================================================================

/**
 * Asserts that a resource exists. Throws NOT_FOUND if null/undefined.
 * @example _requireFound(job, "Job");
 */
export function _requireFound<T>(
  resource: T | null | undefined,
  resourceName: string
): asserts resource is T {
  if (resource === null || resource === undefined) {
    throw new TRPCError({ code: "NOT_FOUND", message: `${resourceName} not found` });
  }
}

// =============================================================================
// Generic Throw Helpers
// =============================================================================

export function _throwBadRequest(message: string, cause?: unknown): never {
  throw new TRPCError({ code: "BAD_REQUEST", message, cause });
}

export function _throwNotFound(message: string, cause?: unknown): never {
  throw new TRPCError({ code: "NOT_FOUND", message, cause });
}

export function _throwForbidden(message: string): never {
  throw new TRPCError({ code: "FORBIDDEN", message });
}

export function _throwUnauthorized(message: string, cause?: unknown): never {
  throw new TRPCError({ code: "UNAUTHORIZED", message, cause });
}

export function _throwInternalError(message: string, cause?: unknown): never {
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message, cause });
}

export function _throwConflict(message: string): never {
  throw new TRPCError({ code: "CONFLICT", message });
}

// =============================================================================
// Domain Error Mapping
// =============================================================================

interface ErrorMapping {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type: new (...args: any[]) => Error;
  code: TRPC_ERROR_CODE_KEY;
  message: string;
}

/**
 * Maps domain errors to TRPCErrors. Always throws.
 * @example
 * catch (error) {
 *   _mapDomainError(error, "Failed to add favorite", [
 *     { type: DuplicateShortcutNameError, code: "CONFLICT", message: `Shortcut "${name}" exists` },
 *     { type: InvalidShortcutNameError, code: "BAD_REQUEST", message: "Invalid shortcut name" },
 *   ]);
 * }
 */
export function _mapDomainError(
  error: unknown,
  fallbackMessage: string,
  mappings: ErrorMapping[]
): never {
  for (const mapping of mappings) {
    if (error instanceof mapping.type) {
      throw new TRPCError({ code: mapping.code, message: mapping.message });
    }
  }
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: fallbackMessage, cause: error });
}
