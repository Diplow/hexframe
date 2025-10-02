import type { ServiceConfig } from "~/app/map/Cache/Services";
import {
  NetworkError as NetworkErrorClass,
  TimeoutError as TimeoutErrorClass,
  ServiceError as ServiceErrorClass,
} from "~/app/map/Cache/Services";

// Default configuration for server service
export const DEFAULT_CONFIG: Required<ServiceConfig> = {
  enableRetry: true,
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  timeoutMs: 10000, // 10 seconds
};

// Retry utility function
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Required<ServiceConfig>,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
    try {
      // Add timeout to the operation
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () =>
            reject(
              new TimeoutErrorClass(
                `Operation timed out after ${config.timeoutMs}ms`,
              ),
            ),
          config.timeoutMs,
        );
      });

      const result = await Promise.race([operation(), timeoutPromise]);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on certain error types
      if (
        error instanceof TimeoutErrorClass ||
        error instanceof ServiceErrorClass
      ) {
        throw error;
      }

      // If this was the last attempt, don't continue retrying
      if (attempt === config.retryAttempts) {
        break;
      }

      // Wait before retrying (exponential backoff)
      const delay = config.retryDelay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // After exhausting retries, wrap the final error in a NetworkError if it's not already a ServiceError
  if (lastError && !(lastError instanceof ServiceErrorClass)) {
    throw new NetworkErrorClass(
      `Operation failed after ${config.retryAttempts} attempts`,
      lastError,
    );
  }

  throw lastError ?? new Error('Unknown error occurred');
}