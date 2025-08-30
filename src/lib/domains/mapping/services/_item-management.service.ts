import type {
  MapItemRepository,
  BaseItemRepository,
} from "~/lib/domains/mapping/_repositories";
import { ItemCrudService } from "~/lib/domains/mapping/services/_item-crud.service";
import { ItemQueryService } from "~/lib/domains/mapping/services/_item-query.service";

/**
 * Coordinating service for item-level operations.
 * Provides access to specialized services for CRUD and query operations.
 *
 * Usage:
 * - For CRUD operations: service.crud.methodName()
 * - For query operations: service.query.methodName()
 */
export class ItemManagementService {
  public readonly crud: ItemCrudService;
  public readonly query: ItemQueryService;

  constructor(repositories: {
    mapItem: MapItemRepository;
    baseItem: BaseItemRepository;
  }) {
    this.crud = new ItemCrudService(repositories);
    this.query = new ItemQueryService(repositories);
  }
}
