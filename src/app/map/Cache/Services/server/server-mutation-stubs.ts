import { ServiceError as ServiceErrorClass } from "~/app/map/Cache/Services";

// Create mutation stubs that throw errors to guide users to proper mutation patterns
export const createMutationStubs = () => ({
  // Mutations are explicitly NOT implemented here
  // They should be handled through the mutation layer using tRPC hooks
  createItem: async () => {
    throw new ServiceErrorClass(
      "Mutations should be handled through the mutation layer, not the server service",
      "ARCHITECTURAL_ERROR",
    );
  },

  updateItem: async () => {
    throw new ServiceErrorClass(
      "Mutations should be handled through the mutation layer, not the server service",
      "ARCHITECTURAL_ERROR",
    );
  },

  deleteItem: async () => {
    throw new ServiceErrorClass(
      "Mutations should be handled through the mutation layer, not the server service",
      "ARCHITECTURAL_ERROR",
    );
  },
});