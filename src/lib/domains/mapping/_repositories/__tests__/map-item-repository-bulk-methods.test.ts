import { describe, it, expect, beforeEach } from "vitest";
import type { MapItemRepository } from "~/lib/domains/mapping/_repositories/map-item";
import type { Attrs as MapItemAttrs } from "~/lib/domains/mapping/_objects/map-item";
import {
  _cleanupDatabase,
  _createTestEnvironment,
  _setupBasicMap,
  _createTestCoordinates,
  _createUniqueTestParams,
  type TestEnvironment,
} from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";
import { Direction } from "~/lib/domains/mapping/utils";
import { MapItemType } from "~/lib/domains/mapping/_objects";

describe("MapItemRepository - bulk createMany method", () => {
  let testEnv: TestEnvironment;
  let mapItemRepo: MapItemRepository;

  beforeEach(async () => {
    await _cleanupDatabase();
    testEnv = _createTestEnvironment();
    mapItemRepo = testEnv.repositories.mapItem;
  });

  describe("createMany", () => {
    it("should create multiple MapItems in a single operation", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      // Create base items for the map items
      const baseItem1 = await testEnv.repositories.baseItem.create({
        attrs: {
          title: "Base 1",
          content: "Content 1",
          link: "",
          preview: undefined,
        },
        relatedItems: {},
        relatedLists: {},
      });

      const baseItem2 = await testEnv.repositories.baseItem.create({
        attrs: {
          title: "Base 2",
          content: "Content 2",
          link: "",
          preview: undefined,
        },
        relatedItems: {},
        relatedLists: {},
      });

      const mapItemsToCreate: Array<{
        attrs: MapItemAttrs;
        ref: typeof baseItem1;
      }> = [
        {
          attrs: {
            parentId: rootMap.id,
            coords: _createTestCoordinates({
              userId: setupParams.userId,
              groupId: setupParams.groupId,
              path: [Direction.East],
            }),
            ref: {
              itemType: MapItemType.BASE,
              itemId: baseItem1.id,
            },
            itemType: MapItemType.BASE,
          },
          ref: baseItem1,
        },
        {
          attrs: {
            parentId: rootMap.id,
            coords: _createTestCoordinates({
              userId: setupParams.userId,
              groupId: setupParams.groupId,
              path: [Direction.West],
            }),
            ref: {
              itemType: MapItemType.BASE,
              itemId: baseItem2.id,
            },
            itemType: MapItemType.BASE,
          },
          ref: baseItem2,
        },
      ];

      const createdItems = await mapItemRepo.createMany(mapItemsToCreate);

      expect(createdItems).toHaveLength(2);
      expect(createdItems[0]!.ref.id).toBe(baseItem1.id);
      expect(createdItems[1]!.ref.id).toBe(baseItem2.id);

      // Verify coordinates
      expect(createdItems[0]!.attrs.coords.path).toEqual([Direction.East]);
      expect(createdItems[1]!.attrs.coords.path).toEqual([Direction.West]);

      // Verify parent relationships
      expect(createdItems[0]!.attrs.parentId).toBe(rootMap.id);
      expect(createdItems[1]!.attrs.parentId).toBe(rootMap.id);
    });

    it("should handle empty array input", async () => {
      const createdItems = await mapItemRepo.createMany([]);

      expect(createdItems).toHaveLength(0);
      expect(createdItems).toEqual([]);
    });

    it("should create single MapItem when array contains one element", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      const baseItem = await testEnv.repositories.baseItem.create({
        attrs: {
          title: "Single Base",
          content: "Content",
          link: "",
          preview: undefined,
        },
        relatedItems: {},
        relatedLists: {},
      });

      const mapItemsToCreate: Array<{
        attrs: MapItemAttrs;
        ref: typeof baseItem;
      }> = [
        {
          attrs: {
            parentId: rootMap.id,
            coords: _createTestCoordinates({
              userId: setupParams.userId,
              groupId: setupParams.groupId,
              path: [Direction.NorthEast],
            }),
            ref: {
              itemType: MapItemType.BASE,
              itemId: baseItem.id,
            },
            itemType: MapItemType.BASE,
          },
          ref: baseItem,
        },
      ];

      const createdItems = await mapItemRepo.createMany(mapItemsToCreate);

      expect(createdItems).toHaveLength(1);
      expect(createdItems[0]!.ref.id).toBe(baseItem.id);
      expect(createdItems[0]!.id).toBeDefined();
    });

    it("should create hierarchical structure with createMany", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      // Create base items
      const baseItems = await testEnv.repositories.baseItem.createMany([
        {
          title: "Parent Item",
          content: "Parent content",
          link: "",
          preview: undefined,
        },
        {
          title: "Child Item 1",
          content: "Child 1 content",
          link: "",
          preview: undefined,
        },
        {
          title: "Child Item 2",
          content: "Child 2 content",
          link: "",
          preview: undefined,
        },
      ]);

      // Create parent map item first
      const parentMapItem = await mapItemRepo.create({
        attrs: {
          parentId: rootMap.id,
          coords: _createTestCoordinates({
            userId: setupParams.userId,
            groupId: setupParams.groupId,
            path: [Direction.East],
          }),
          ref: {
            itemType: MapItemType.BASE,
            itemId: baseItems[0]!.id,
          },
          itemType: MapItemType.BASE,
        },
        relatedItems: {
          ref: baseItems[0]!,
          parent: rootMap,
        },
        relatedLists: {
          neighbors: [],
        },
      });

      // Create children map items in bulk
      const childMapItems = await mapItemRepo.createMany([
        {
          attrs: {
            parentId: parentMapItem.id,
            coords: _createTestCoordinates({
              userId: setupParams.userId,
              groupId: setupParams.groupId,
              path: [Direction.East, Direction.NorthEast],
            }),
            ref: {
              itemType: MapItemType.BASE,
              itemId: baseItems[1]!.id,
            },
            itemType: MapItemType.BASE,
          },
          ref: baseItems[1]!,
        },
        {
          attrs: {
            parentId: parentMapItem.id,
            coords: _createTestCoordinates({
              userId: setupParams.userId,
              groupId: setupParams.groupId,
              path: [Direction.East, Direction.SouthEast],
            }),
            ref: {
              itemType: MapItemType.BASE,
              itemId: baseItems[2]!.id,
            },
            itemType: MapItemType.BASE,
          },
          ref: baseItems[2]!,
        },
      ]);

      expect(childMapItems).toHaveLength(2);
      expect(childMapItems[0]!.attrs.parentId).toBe(parentMapItem.id);
      expect(childMapItems[1]!.attrs.parentId).toBe(parentMapItem.id);

      // Verify path depths
      expect(childMapItems[0]!.attrs.coords.path.length).toBe(2);
      expect(childMapItems[1]!.attrs.coords.path.length).toBe(2);
    });

    it("should handle large batch creation of MapItems", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      const itemCount = 20;
      const baseItems = await testEnv.repositories.baseItem.createMany(
        Array.from({ length: itemCount }, (_, i) => ({
          title: `Bulk Item ${i + 1}`,
          content: `Content ${i + 1}`,
          link: "",
          preview: undefined,
        }))
      );

      const directions = [
        Direction.East,
        Direction.West,
        Direction.NorthEast,
        Direction.NorthWest,
        Direction.SouthEast,
        Direction.SouthWest,
      ];

      const mapItemsToCreate = baseItems.map((baseItem, i) => ({
        attrs: {
          parentId: rootMap.id,
          coords: _createTestCoordinates({
            userId: setupParams.userId,
            groupId: setupParams.groupId,
            path: [directions[i % directions.length]!, i + 1],
          }),
          ref: {
            itemType: MapItemType.BASE,
            itemId: baseItem.id,
          },
          itemType: MapItemType.BASE,
        },
        ref: baseItem,
      }));

      const createdMapItems = await mapItemRepo.createMany(mapItemsToCreate);

      expect(createdMapItems).toHaveLength(itemCount);

      // Verify first and last
      expect(createdMapItems[0]!.ref.attrs.title).toBe("Bulk Item 1");
      expect(createdMapItems[itemCount - 1]!.ref.attrs.title).toBe(`Bulk Item ${itemCount}`);
    });
  });
});
