import { TRPCError } from "@trpc/server";

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
