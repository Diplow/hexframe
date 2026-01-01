import { TRPCError } from "@trpc/server";

interface AuthUser {
  id: string;
  name?: string;
  email?: string;
}

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

/**
 * Asserts that user owns the resource. Throws FORBIDDEN if not.
 * @example _requireOwnership(item.ownerId, currentUserId, "delete items");
 */
export function _requireOwnership(ownerId: string, userId: string, action: string): void {
  if (ownerId !== userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You can only ${action} that you own`,
    });
  }
}

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
