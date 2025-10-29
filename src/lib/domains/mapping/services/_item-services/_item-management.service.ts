import type {
  MapItemRepository,
  BaseItemRepository,
} from "~/lib/domains/mapping/_repositories";
import { ItemCrudService } from "~/lib/domains/mapping/services/_item-services/_item-crud.service";
import { ItemQueryService } from "~/lib/domains/mapping/services/_item-services/_item-query.service";
import { ItemHistoryService } from "~/lib/domains/mapping/services/_item-services/_item-history.service";

/**
 * Coordinating service for item-level operations.
 * Provides access to specialized services for CRUD, query, and history operations.
 *
 * Usage:
 * - For CRUD operations: service.crud.methodName()
 * - For query operations: service.query.methodName()
 * - For history operations: service.history.methodName()
 */
export class ItemManagementService {
  public readonly crud: ItemCrudService;
  public readonly query: ItemQueryService;
  public readonly history: ItemHistoryService;

  constructor(repositories: {
    mapItem: MapItemRepository;
    baseItem: BaseItemRepository;
  }) {
    this.crud = new ItemCrudService(repositories);
    this.query = new ItemQueryService(repositories);
    this.history = new ItemHistoryService(repositories);
  }
}
