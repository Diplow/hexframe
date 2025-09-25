import type { ServiceConfig, ServerService } from "~/app/map/Cache/Services/types";
import { ServiceError as ServiceErrorClass } from "~/app/map/Cache/Services/types";
import type { api } from "~/commons/trpc/react";
import { createServerService } from "~/app/map/Cache/Services/server/server-service";

// Factory function for easier dependency injection
export function createServerServiceFactory(
  config: ServiceConfig = {},
): (utils: ReturnType<typeof api.useUtils>) => ServerService {
  return (utils) => createServerService(utils, config);
}

// Mock server service for testing
export function createMockServerService(
  mockResponses: Partial<ServerService> = {},
): ServerService {
  return {
    fetchItemsForCoordinate:
      mockResponses.fetchItemsForCoordinate ??
      (async () => {
        throw new ServiceErrorClass("Mock not implemented", "NOT_IMPLEMENTED");
      }),
    getItemByCoordinate:
      mockResponses.getItemByCoordinate ??
      (async () => {
        throw new ServiceErrorClass("Mock not implemented", "NOT_IMPLEMENTED");
      }),
    getRootItemById:
      mockResponses.getRootItemById ??
      (async () => {
        throw new ServiceErrorClass("Mock not implemented", "NOT_IMPLEMENTED");
      }),
    getDescendants:
      mockResponses.getDescendants ??
      (async () => {
        throw new ServiceErrorClass("Mock not implemented", "NOT_IMPLEMENTED");
      }),
    getAncestors:
      mockResponses.getAncestors ??
      (async () => {
        throw new ServiceErrorClass("Mock not implemented", "NOT_IMPLEMENTED");
      }),
    getItemWithGenerations:
      mockResponses.getItemWithGenerations ??
      (async () => {
        throw new ServiceErrorClass("Mock not implemented", "NOT_IMPLEMENTED");
      }),
    createItem:
      mockResponses.createItem ??
      (async () => {
        throw new ServiceErrorClass("Mock not implemented", "NOT_IMPLEMENTED");
      }),
    updateItem:
      mockResponses.updateItem ??
      (async () => {
        throw new ServiceErrorClass("Mock not implemented", "NOT_IMPLEMENTED");
      }),
    deleteItem:
      mockResponses.deleteItem ??
      (async () => {
        throw new ServiceErrorClass("Mock not implemented", "NOT_IMPLEMENTED");
      }),
  };
}