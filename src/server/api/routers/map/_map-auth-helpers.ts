import { TRPCError } from "@trpc/server";
import { UserMappingService } from "~/lib/domains/iam";

interface AuthUser {
  id: string;
  name?: string;
  email?: string;
}

export function _ensureUserAuthenticated(
  user: unknown,
): asserts user is AuthUser {
  if (!user || typeof user !== 'object') {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User not authenticated",
    });
  }
  
  const authUser = user as Record<string, unknown>;
  if (!authUser.id || typeof authUser.id !== 'string') {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid user format",
    });
  }
}

export async function _getUserId(user: unknown): Promise<number> {
  _ensureUserAuthenticated(user);

  // user.id is a string from better-auth, convert it to integer for mapping system
  return await UserMappingService.getOrCreateMappingUserId(user.id);
}

export function _getUserName(user: unknown): string {
  _ensureUserAuthenticated(user);
  return user.name ?? user.email ?? "User";
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
