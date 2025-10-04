import { withRetry } from "~/app/map/Cache/Services/server/server-retry-utils";
import { withErrorTransform } from "~/app/map/Cache/Services/server/server-operations";
import type { ServiceConfig } from "~/app/map/Cache/Services";

/**
 * Wraps an operation with retry and error transform logic
 * This eliminates the need for repetitive operation wrapper functions
 */
export async function _wrapOperation<T>(
  operation: () => Promise<T>,
  finalConfig: Required<ServiceConfig>
): Promise<T> {
  return finalConfig.enableRetry
    ? withRetry(() => withErrorTransform(operation, finalConfig), finalConfig)
    : withErrorTransform(operation, finalConfig);
}
