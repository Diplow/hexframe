import { describe, it, expect, vi, beforeEach } from "vitest";
import { MapItemActions } from "~/lib/domains/mapping/_actions/map-item-actions";
import { ItemCrudService } from "~/lib/domains/mapping/services/_item-services/_item-crud.service";
import { MapItemType } from "~/lib/domains/mapping/_objects";
import type { MapItemWithId } from "~/lib/domains/mapping/_objects";
import { TransactionManager } from "~/lib/domains/mapping/infrastructure/transaction-manager";
import type { MapItemRepository, BaseItemRepository } from "~/lib/domains/mapping/_repositories";
import type { DatabaseTransaction } from "~/lib/domains/mapping/types/transaction";
import type { MapItemIdr } from "~/lib/domains/mapping/_repositories/map-item";

describe("MapItemActions - Transaction Support", () => {
  let mapItemRepo: MapItemRepository & { withTransaction: (tx: DatabaseTransaction) => MapItemRepository };
  let baseItemRepo: BaseItemRepository & { withTransaction: (tx: DatabaseTransaction) => BaseItemRepository };
  let actions: MapItemActions;
  let service: ItemCrudService;

  beforeEach(() => {
    // Create mock repositories with transaction support
    const baseMapItemRepo: MapItemRepository = {
      handleCascading: vi.fn(() => true),
      getOne: vi.fn(),
      getOneByIdr: vi.fn(),
      exists: vi.fn(),
      getMany: vi.fn(),
      getManyByIdr: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateByIdr: vi.fn(),
      updateRelatedItem: vi.fn(),
      updateRelatedItemByIdr: vi.fn(),
      addToRelatedList: vi.fn(),
      addToRelatedListByIdr: vi.fn(),
      removeFromRelatedList: vi.fn(),
      removeFromRelatedListByIdr: vi.fn(),
      remove: vi.fn(),
      removeByIdr: vi.fn(),
      getRootItem: vi.fn(),
      getRootItemsForUser: vi.fn(),
      getDescendantsByParent: vi.fn(),
      getDescendantsWithDepth: vi.fn(),
      getContextForCenter: vi.fn(),
      batchUpdateItemAndDescendants: vi.fn(),
      updateVisibility: vi.fn(),
    };
    
    mapItemRepo = {
      ...baseMapItemRepo,
      withTransaction: vi.fn(),
    } as MapItemRepository & { withTransaction: (tx: DatabaseTransaction) => MapItemRepository };

    const baseBaseItemRepo: BaseItemRepository = {
      handleCascading: vi.fn(() => true),
      getOne: vi.fn(),
      getOneByIdr: vi.fn(),
      exists: vi.fn(),
      getMany: vi.fn(),
      getManyByIdr: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateByIdr: vi.fn(),
      updateRelatedItem: vi.fn(),
      updateRelatedItemByIdr: vi.fn(),
      addToRelatedList: vi.fn(),
      addToRelatedListByIdr: vi.fn(),
      removeFromRelatedList: vi.fn(),
      getVersionHistory: vi.fn(),
      getVersionByNumber: vi.fn(),
      getLatestVersion: vi.fn(),
      countVersions: vi.fn(),
      removeFromRelatedListByIdr: vi.fn(),
      remove: vi.fn(),
      removeByIdr: vi.fn(),
    };
    
    baseItemRepo = {
      ...baseBaseItemRepo,
      withTransaction: vi.fn(),
    } as BaseItemRepository & { withTransaction: (tx: DatabaseTransaction) => BaseItemRepository };

    actions = new MapItemActions({
      mapItem: mapItemRepo,
      baseItem: baseItemRepo,
    });
    
    service = new ItemCrudService({
      mapItem: mapItemRepo,
      baseItem: baseItemRepo,
    });
  });

  it("should accept transaction parameter in moveMapItem", async () => {
    // Setup mock data
    const sourceItem = {
      id: 1,
      attrs: {
        coords: { userId: "user-test-1", groupId: 1, path: [1] },
        itemType: MapItemType.BASE,
      },
    } as unknown as MapItemWithId;

    // Mock repository behavior for getOneByIdr
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const getOneByIdrFn = mapItemRepo.getOneByIdr;
    vi.mocked(getOneByIdrFn).mockImplementation(async ({ idr }: { idr: MapItemIdr }) => {
      if ('attrs' in idr && idr.attrs && 'coords' in idr.attrs) {
        const coords = idr.attrs.coords;
        if (coords.path.length > 0 && Number(coords.path[0]) === 1) return sourceItem;
      }
      throw new Error('Item not found');
    });

    // Create a mock transaction
    const mockTx = {} as DatabaseTransaction;

    // Create transaction-aware repository mocks
    const txMapItemRepo = { ...mapItemRepo };
    const txBaseItemRepo = { ...baseItemRepo };

    const withTransactionMock = vi.mocked(mapItemRepo.withTransaction);
    withTransactionMock.mockReturnValue(txMapItemRepo);
    const baseWithTransactionMock = vi.mocked(baseItemRepo.withTransaction);
    baseWithTransactionMock.mockReturnValue(txBaseItemRepo);

    // Call action with transaction
    const oldCoords = { userId: "user-test-1", groupId: 1, path: [1] };
    const newCoords = { userId: "user-test-1", groupId: 1, path: [2] };

    try {
      await actions.moveMapItem({ oldCoords, newCoords, tx: mockTx });
    } catch {
      // Expected to fail due to incomplete mocking
    }

    // Verify withTransaction was called when tx was provided
    expect(mapItemRepo.withTransaction).toHaveBeenCalledWith(mockTx);
    expect(baseItemRepo.withTransaction).toHaveBeenCalledWith(mockTx);
  });

  it("service should wrap operations in transaction", async () => {
    // Mock the TransactionManager
    const runInTransactionSpy = vi.spyOn(TransactionManager, "runInTransaction");
    runInTransactionSpy.mockImplementation(async <T>(fn: (tx: DatabaseTransaction) => Promise<T>) => {
      const mockTx = {} as DatabaseTransaction;
      return await fn(mockTx);
    });
    
    // Mock repository behavior
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const getOneByIdrFn2 = mapItemRepo.getOneByIdr;
    vi.mocked(getOneByIdrFn2).mockImplementation(async () => {
      return {
        id: 1,
        attrs: {
          coords: { userId: "user-test-1", groupId: 1, path: [1] },
          itemType: MapItemType.BASE,
        },
      } as unknown as MapItemWithId;
    });

    const withTransactionMock2 = vi.mocked(mapItemRepo.withTransaction);
    withTransactionMock2.mockReturnValue(mapItemRepo);
    const baseWithTransactionMock2 = vi.mocked(baseItemRepo.withTransaction);
    baseWithTransactionMock2.mockReturnValue(baseItemRepo);

    // Call service method
    const oldCoords = { userId: "user-test-1", groupId: 1, path: [1] };
    const newCoords = { userId: "user-test-1", groupId: 1, path: [2] };

    try {
      await service.moveMapItem({ oldCoords, newCoords });
    } catch {
      // Expected to fail due to incomplete mocking
    }

    // Verify TransactionManager was used
    expect(runInTransactionSpy).toHaveBeenCalled();
  });
});