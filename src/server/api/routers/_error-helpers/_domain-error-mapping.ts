import { TRPCError } from "@trpc/server";
import type { TRPC_ERROR_CODE_KEY } from "@trpc/server/rpc";

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
