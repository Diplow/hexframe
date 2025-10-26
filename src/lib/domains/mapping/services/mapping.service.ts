import type {
  MapItemRepository,
  BaseItemRepository,
} from "~/lib/domains/mapping/_repositories";
import { MapManagementService } from "~/lib/domains/mapping/services/_map-management.service";
import { ItemManagementService } from "~/lib/domains/mapping/services/_item-services";

/**
 * Main coordinating service for mapping operations.
 * Provides access to specialized services for maps and items.
 *
 * Usage:
 * - For map-level operations: service.maps.methodName()
 * - For item-level operations: service.items.methodName()
 */
export class MappingService {
  public readonly maps: MapManagementService;
  public readonly items: ItemManagementService;

  constructor(repositories: {
    mapItem: MapItemRepository;
    baseItem: BaseItemRepository;
  }) {
    this.maps = new MapManagementService(repositories);
    this.items = new ItemManagementService(repositories);
  }
}
