import { describe, it, expect, beforeEach } from "vitest";
import {
  _cleanupDatabase,
  _createTestEnvironment,
  _setupBasicMap,
  _createTestCoordinates,
  _createUniqueTestParams,
  createTestItem,
  type TestEnvironment,
} from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";
import { Direction } from "~/lib/domains/mapping/utils";
import { MapItemType, Visibility } from "~/lib/domains/mapping/_objects";
import { SYSTEM_INTERNAL } from "~/lib/domains/mapping/types";

describe("MapItem Copy Helpers", () => {
  let testEnv: TestEnvironment;

  beforeEach(async () => {
    await _cleanupDatabase();
    testEnv = _createTestEnvironment();
  });

  describe("_prepareBaseItemsForCopy", () => {
    it("should prepare single BaseItem for copying with originId", async () => {
      // This test will fail until implementation exists
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      const originalItem = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East],
        }),
        title: "Original Item",
        content: "Original content",
      });

      // Import the helper function (will fail until it exists)
      const { _prepareBaseItemsForCopy } = await import(
        "~/lib/domains/mapping/_actions/_map-item-copy-helpers"
      );

      // Get the original item from the repository
      const originalMapItem = await testEnv.repositories.mapItem.getOneByIdr({
        idr: { id: Number(originalItem.id) },
      }, SYSTEM_INTERNAL);

      const preparedItems = _prepareBaseItemsForCopy([originalMapItem.ref]);

      expect(preparedItems).toHaveLength(1);
      expect(preparedItems[0]!.title).toBe("Original Item");
      expect(preparedItems[0]!.content).toBe("Original content");
      expect(preparedItems[0]!.originId).toBe(originalMapItem.ref.id);
    });

    it("should prepare multiple BaseItems for copying", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East],
        }),
        title: "Item 1",
        content: "Content 1",
      });

      await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.West],
        }),
        title: "Item 2",
        content: "Content 2",
      });

      const { _prepareBaseItemsForCopy } = await import(
        "~/lib/domains/mapping/_actions/_map-item-copy-helpers"
      );

      const baseItemsToCopy = await testEnv.repositories.mapItem.getMany({
        limit: 10,
      }, SYSTEM_INTERNAL);

      const preparedItems = _prepareBaseItemsForCopy(
        baseItemsToCopy
          .filter(mi => (mi.attrs.itemType as MapItemType) === MapItemType.CONTEXT)
          .map(mi => mi.ref)
      );

      expect(preparedItems.length).toBeGreaterThanOrEqual(2);
      preparedItems.forEach(item => {
        expect(item.originId).toBeDefined();
        expect(typeof item.originId).toBe("number");
      });
    });

    it("should preserve all attributes except id when preparing for copy", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East],
        }),
        title: "Full Item",
        content: "Full content",
        preview: "Preview text",
        link: "https://example.com",
      });

      const { _prepareBaseItemsForCopy } = await import(
        "~/lib/domains/mapping/_actions/_map-item-copy-helpers"
      );

      const baseItems = await testEnv.repositories.mapItem.getMany({ limit: 10 }, SYSTEM_INTERNAL);
      const targetItem = baseItems.find(
        mi => mi.ref.attrs.title === "Full Item"
      );
      expect(targetItem).toBeDefined();

      const preparedItems = _prepareBaseItemsForCopy([targetItem!.ref]);

      expect(preparedItems).toHaveLength(1);
      expect(preparedItems[0]!.title).toBe("Full Item");
      expect(preparedItems[0]!.content).toBe("Full content");
      expect(preparedItems[0]!.preview).toBe("Preview text");
      expect(preparedItems[0]!.link).toBe("https://example.com");
      expect(preparedItems[0]!.originId).toBe(targetItem!.ref.id);
    });
  });

  describe("_prepareMapItemsForCopy", () => {
    it("should prepare MapItems with new coordinates for destination", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      const originalItem = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East],
        }),
        title: "Original",
        content: "Content",
      });

      const { _prepareMapItemsForCopy } = await import(
        "~/lib/domains/mapping/_actions/_map-item-copy-helpers"
      );

      const sourceMapItem = await testEnv.repositories.mapItem.getOneByIdr({
        idr: { id: Number(originalItem.id) },
      }, SYSTEM_INTERNAL);

      const destinationCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.West],
      });

      const preparedMapItems = _prepareMapItemsForCopy(
        [sourceMapItem],
        destinationCoords,
        rootMap.id
      );

      expect(preparedMapItems).toHaveLength(1);
      expect(preparedMapItems[0]!.coords.path).toEqual([Direction.West]);
      expect(preparedMapItems[0]!.parentId).toBe(rootMap.id);
    });

    it("should adjust paths for nested items when copying subtree", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      // Create parent
      const parentItem = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East],
        }),
        title: "Parent",
        content: "Parent content",
      });

      // Create child
      await createTestItem(testEnv, {
        parentId: Number(parentItem.id),
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East, Direction.NorthEast],
        }),
        title: "Child",
        content: "Child content",
      });

      const { _prepareMapItemsForCopy } = await import(
        "~/lib/domains/mapping/_actions/_map-item-copy-helpers"
      );

      const descendants = await testEnv.repositories.mapItem.getDescendantsByParent({
        parentPath: [],
        parentUserId: setupParams.userId,
        parentGroupId: setupParams.groupId,
        requester: SYSTEM_INTERNAL,
      });

      const sourceMapItems = descendants.filter(
        mi => mi.attrs.coords.path[0] === Direction.East
      );

      const destinationCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.West],
      });

      const preparedMapItems = _prepareMapItemsForCopy(
        sourceMapItems,
        destinationCoords,
        rootMap.id
      );

      // Should have parent and child
      expect(preparedMapItems.length).toBeGreaterThanOrEqual(2);

      // Parent should have new path [West]
      const parentCopy = preparedMapItems.find(
        mi => mi.coords.path.length === 1
      );
      expect(parentCopy?.coords.path).toEqual([Direction.West]);
      expect(parentCopy?.parentId).toBe(rootMap.id); // Root gets destinationParentId
      expect(parentCopy?.sourceParentId).toBeNull(); // Root has no source parent

      // Child should have new path [West, NorthEast]
      const childCopy = preparedMapItems.find(mi => mi.coords.path.length === 2);
      expect(childCopy?.coords.path).toEqual([Direction.West, Direction.NorthEast]);

      // Child should have sourceParentId pointing to original parent
      expect(childCopy?.sourceParentId).toBe(Number(parentItem.id));

      // Child's parentId will be temporary - it gets resolved during creation
      // (This is the key insight: prepared items store sourceParentId,
      // which is used to look up the new parent ID after parents are created)
    });
  });

  describe("_createCopyMapping", () => {
    it("should create mapping from source to copy IDs", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      const item1 = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East],
        }),
        title: "Item 1",
        content: "Content 1",
      });

      const item2 = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.West],
        }),
        title: "Item 2",
        content: "Content 2",
      });

      const { _createCopyMapping } = await import(
        "~/lib/domains/mapping/_actions/_map-item-copy-helpers"
      );

      const sourceMapItems = await testEnv.repositories.mapItem.getManyByIdr({
        idrs: [{ id: Number(item1.id) }, { id: Number(item2.id) }],
      }, SYSTEM_INTERNAL);

      // Get the BaseItem IDs from the MapItems
      const mapItem1 = await testEnv.repositories.mapItem.getOneByIdr({
        idr: { id: Number(item1.id) },
      }, SYSTEM_INTERNAL);
      const mapItem2 = await testEnv.repositories.mapItem.getOneByIdr({
        idr: { id: Number(item2.id) },
      }, SYSTEM_INTERNAL);

      const copiedBaseItems = await testEnv.repositories.baseItem.createMany([
        {
          title: "Item 1",
          content: "Content 1",
          link: "",
          preview: undefined,
          originId: mapItem1.ref.id,
        },
        {
          title: "Item 2",
          content: "Content 2",
          link: "",
          preview: undefined,
          originId: mapItem2.ref.id,
        },
      ]);

      const mapping = _createCopyMapping(
        sourceMapItems,
        copiedBaseItems
      );

      expect(mapping.size).toBe(2);
      expect(mapping.get(mapItem1.ref.id)).toBe(copiedBaseItems[0]!.id);
      expect(mapping.get(mapItem2.ref.id)).toBe(copiedBaseItems[1]!.id);
    });
  });

  describe("_buildMapItemsWithCopiedRefs", () => {
    it("should build MapItems with copied BaseItem references", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      const originalItem = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East],
        }),
        title: "Original",
        content: "Content",
      });

      const { _buildMapItemsWithCopiedRefs } = await import(
        "~/lib/domains/mapping/_actions/_map-item-copy-helpers"
      );

      // Get the actual MapItem to access the BaseItem ref
      const originalMapItem = await testEnv.repositories.mapItem.getOneByIdr({
        idr: { id: Number(originalItem.id) },
      }, SYSTEM_INTERNAL);

      const copiedBaseItem = await testEnv.repositories.baseItem.create({
        attrs: {
          title: "Original",
          content: "Content",
          link: "",
          preview: undefined,
          originId: originalMapItem.ref.id,
        },
        relatedItems: {},
        relatedLists: {},
      });

      const mapping = new Map([[originalMapItem.ref.id, copiedBaseItem.id]]);

      const destinationCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.West],
      });

      const preparedMapItems = [
        {
          coords: destinationCoords,
          parentId: rootMap.id,
          sourceRefId: originalMapItem.ref.id,
          visibility: Visibility.PRIVATE,
          itemType: MapItemType.ORGANIZATIONAL,
        },
      ];

      const builtMapItems = _buildMapItemsWithCopiedRefs(
        preparedMapItems,
        mapping,
        [copiedBaseItem]
      );

      expect(builtMapItems).toHaveLength(1);
      expect(builtMapItems[0]!.attrs.baseItemId).toBe(copiedBaseItem.id);
      expect(builtMapItems[0]!.attrs.coords.path).toEqual([Direction.West]);
      expect(builtMapItems[0]!.attrs.parentId).toBe(rootMap.id);
      expect(builtMapItems[0]!.attrs.itemType).toBe(MapItemType.ORGANIZATIONAL);
    });
  });
});
