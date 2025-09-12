import type { ServerService, ServiceConfig } from "../types";
import {
  NetworkError as NetworkErrorClass,
  TimeoutError as TimeoutErrorClass,
  ServiceError as ServiceErrorClass,
} from "../types";
import type { api } from "~/commons/trpc/react";
import { createQueryOperations } from "./server-query-operations";
import { createMutationStubs } from "./server-mutation-stubs";

// Wrapper for tRPC errors to ServiceError types
export const withErrorTransform = async <T>(
  operation: () => Promise<T>,
  finalConfig: Required<ServiceConfig>
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    // Transform tRPC errors into ServiceError types
    if (error instanceof Error) {
      if (error.message.includes("UNAUTHORIZED")) {
        throw new ServiceErrorClass(
          "Unauthorized access to map data",
          "UNAUTHORIZED",
          error,
        );
      } else if (error.message.includes("NOT_FOUND")) {
        throw new ServiceErrorClass("Map data not found", "NOT_FOUND", error);
      } else if (error.message.includes("TIMEOUT")) {
        throw new TimeoutErrorClass("Request timed out");
      }
    }

    // For retry logic, just re-throw the original error without wrapping
    // The retry mechanism will handle wrapping it in NetworkError after retries are exhausted
    // However, if retry is disabled, we need to wrap it ourselves
    if (!finalConfig.enableRetry) {
      throw new NetworkErrorClass("Server request failed", error instanceof Error ? error : new Error(String(error)));
    }

    throw error;
  }
};

// Create server service operations by combining queries and mutation stubs
export const createServerOperations = (
  utils: ReturnType<typeof api.useUtils>,
  finalConfig: Required<ServiceConfig>
): ServerService => ({
  ...createQueryOperations(utils, finalConfig),
  ...createMutationStubs(),
});