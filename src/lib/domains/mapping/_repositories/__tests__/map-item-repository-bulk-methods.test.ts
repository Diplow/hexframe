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

      // Get the actual root MapItem
      const rootMapItem = await mapItemRepo.getOne(rootMap.id);
      if (!rootMapItem) {
        throw new Error("Root map not found");
      }

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
          parent: null,
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

      const mapItemsToCreate = baseItems.map((baseItem, i) => {
        // Create unique paths by varying depth
        const depth = Math.floor(i / directions.length) + 1;
        const path: Direction[] = [];
        for (let d = 0; d < depth; d++) {
          path.push(directions[(i + d) % directions.length]!);
        }

        return {
          attrs: {
            parentId: rootMap.id,
            coords: _createTestCoordinates({
              userId: setupParams.userId,
              groupId: setupParams.groupId,
              path,
            }),
            ref: {
              itemType: MapItemType.BASE,
              itemId: baseItem.id,
            },
            itemType: MapItemType.BASE,
          },
          ref: baseItem,
        };
      });

      const createdMapItems = await mapItemRepo.createMany(mapItemsToCreate);

      expect(createdMapItems).toHaveLength(itemCount);

      // Verify first and last
      expect(createdMapItems[0]!.ref.attrs.title).toBe("Bulk Item 1");
      expect(createdMapItems[itemCount - 1]!.ref.attrs.title).toBe(`Bulk Item ${itemCount}`);
    });
  });

  describe("createMany with negative directions", () => {
    it("should create multiple composed children with negative directions in bulk", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      // Create parent tile
      const parentCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.NorthEast],
      });
      const parentBaseItem = await testEnv.repositories.baseItem.create({
        attrs: {
          title: "Parent",
          content: "Parent content",
          link: "",
          preview: undefined,
        },
        relatedItems: {},
        relatedLists: {},
      });
      const parentItem = await mapItemRepo.create({
        attrs: {
          parentId: rootMap.id,
          coords: parentCoords,
          ref: {
            itemType: MapItemType.BASE,
            itemId: parentBaseItem.id,
          },
          itemType: MapItemType.BASE,
        },
        relatedItems: {
          ref: parentBaseItem,
          parent: null,
        },
        relatedLists: {
          neighbors: [],
        },
      });

      // Create base items for composed children
      const composedBaseItems = await testEnv.repositories.baseItem.createMany([
        {
          title: "Composed NW",
          content: "Northwest composed content",
          link: "",
          preview: undefined,
        },
        {
          title: "Composed NE",
          content: "Northeast composed content",
          link: "",
          preview: undefined,
        },
        {
          title: "Composed E",
          content: "East composed content",
          link: "",
          preview: undefined,
        },
      ]);

      // Create composed children in bulk with negative directions
      const composedMapItems = await mapItemRepo.createMany([
        {
          attrs: {
            parentId: parentItem.id,
            coords: _createTestCoordinates({
              userId: setupParams.userId,
              groupId: setupParams.groupId,
              path: [Direction.NorthEast, Direction.ComposedNorthWest],
            }),
            ref: {
              itemType: MapItemType.BASE,
              itemId: composedBaseItems[0]!.id,
            },
            itemType: MapItemType.BASE,
          },
          ref: composedBaseItems[0]!,
        },
        {
          attrs: {
            parentId: parentItem.id,
            coords: _createTestCoordinates({
              userId: setupParams.userId,
              groupId: setupParams.groupId,
              path: [Direction.NorthEast, Direction.ComposedNorthEast],
            }),
            ref: {
              itemType: MapItemType.BASE,
              itemId: composedBaseItems[1]!.id,
            },
            itemType: MapItemType.BASE,
          },
          ref: composedBaseItems[1]!,
        },
        {
          attrs: {
            parentId: parentItem.id,
            coords: _createTestCoordinates({
              userId: setupParams.userId,
              groupId: setupParams.groupId,
              path: [Direction.NorthEast, Direction.ComposedEast],
            }),
            ref: {
              itemType: MapItemType.BASE,
              itemId: composedBaseItems[2]!.id,
            },
            itemType: MapItemType.BASE,
          },
          ref: composedBaseItems[2]!,
        },
      ]);

      // Verify all 3 composed children were created
      expect(composedMapItems).toHaveLength(3);

      // Verify they all have negative directions
      composedMapItems.forEach((item) => {
        expect(item.attrs.coords.path).toHaveLength(2);
        const lastDirection = item.attrs.coords.path[item.attrs.coords.path.length - 1];
        expect(lastDirection).toBeLessThan(0);
        expect(lastDirection).toBeGreaterThanOrEqual(-6);
        expect(item.attrs.parentId).toBe(parentItem.id);
      });

      // Verify titles match
      expect(composedMapItems[0]!.ref.attrs.title).toBe("Composed NW");
      expect(composedMapItems[1]!.ref.attrs.title).toBe("Composed NE");
      expect(composedMapItems[2]!.ref.attrs.title).toBe("Composed E");

      // Verify paths are correctly serialized
      expect(composedMapItems[0]!.attrs.coords.path).toEqual([
        Direction.NorthEast,
        Direction.ComposedNorthWest,
      ]);
      expect(composedMapItems[1]!.attrs.coords.path).toEqual([
        Direction.NorthEast,
        Direction.ComposedNorthEast,
      ]);
      expect(composedMapItems[2]!.attrs.coords.path).toEqual([
        Direction.NorthEast,
        Direction.ComposedEast,
      ]);
    });

    it("should create all 6 composed children with negative directions in one bulk operation", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      // Create parent tile
      const parentCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.West],
      });
      const parentBaseItem = await testEnv.repositories.baseItem.create({
        attrs: {
          title: "Hexagon Parent",
          content: "Parent with full composition",
          link: "",
          preview: undefined,
        },
        relatedItems: {},
        relatedLists: {},
      });
      const parentItem = await mapItemRepo.create({
        attrs: {
          parentId: rootMap.id,
          coords: parentCoords,
          ref: {
            itemType: MapItemType.BASE,
            itemId: parentBaseItem.id,
          },
          itemType: MapItemType.BASE,
        },
        relatedItems: {
          ref: parentBaseItem,
          parent: null,
        },
        relatedLists: {
          neighbors: [],
        },
      });

      // Create base items for all 6 composed children
      const composedDirections = [
        { dir: Direction.ComposedNorthWest, label: "NW" },
        { dir: Direction.ComposedNorthEast, label: "NE" },
        { dir: Direction.ComposedEast, label: "E" },
        { dir: Direction.ComposedSouthEast, label: "SE" },
        { dir: Direction.ComposedSouthWest, label: "SW" },
        { dir: Direction.ComposedWest, label: "W" },
      ];

      const composedBaseItems = await testEnv.repositories.baseItem.createMany(
        composedDirections.map(({ label }) => ({
          title: `Composed ${label}`,
          content: `${label} content`,
          link: "",
          preview: undefined,
        }))
      );

      // Create all 6 composed children in one bulk operation
      const composedMapItems = await mapItemRepo.createMany(
        composedDirections.map(({ dir }, index) => ({
          attrs: {
            parentId: parentItem.id,
            coords: _createTestCoordinates({
              userId: setupParams.userId,
              groupId: setupParams.groupId,
              path: [Direction.West, dir],
            }),
            ref: {
              itemType: MapItemType.BASE,
              itemId: composedBaseItems[index]!.id,
            },
            itemType: MapItemType.BASE,
          },
          ref: composedBaseItems[index]!,
        }))
      );

      // Verify all 6 were created
      expect(composedMapItems).toHaveLength(6);

      // Verify all have negative directions
      composedMapItems.forEach((item) => {
        const lastDirection = item.attrs.coords.path[item.attrs.coords.path.length - 1];
        expect(lastDirection).toBeLessThan(0);
        expect(lastDirection).toBeGreaterThanOrEqual(-6);
      });

      // Verify unique negative directions (-1 through -6)
      const negativeDirections = composedMapItems.map(
        (item) => item.attrs.coords.path[item.attrs.coords.path.length - 1]
      );
      const uniqueDirections = new Set(negativeDirections);
      expect(uniqueDirections.size).toBe(6);
      expect(Array.from(uniqueDirections).sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual([-6, -5, -4, -3, -2, -1]);
    });

    it("should handle mixed structural and composed children in bulk", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      // Create parent tile
      const parentCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.SouthEast],
      });
      const parentBaseItem = await testEnv.repositories.baseItem.create({
        attrs: {
          title: "Parent with Mixed Children",
          content: "Has both structural and composed children",
          link: "",
          preview: undefined,
        },
        relatedItems: {},
        relatedLists: {},
      });
      const parentItem = await mapItemRepo.create({
        attrs: {
          parentId: rootMap.id,
          coords: parentCoords,
          ref: {
            itemType: MapItemType.BASE,
            itemId: parentBaseItem.id,
          },
          itemType: MapItemType.BASE,
        },
        relatedItems: {
          ref: parentBaseItem,
          parent: null,
        },
        relatedLists: {
          neighbors: [],
        },
      });

      // Create base items for mixed children
      const baseItems = await testEnv.repositories.baseItem.createMany([
        { title: "Structural NE", content: "Structural", link: "", preview: undefined },
        { title: "Composed NW", content: "Composed", link: "", preview: undefined },
        { title: "Structural E", content: "Structural", link: "", preview: undefined },
        { title: "Composed SE", content: "Composed", link: "", preview: undefined },
      ]);

      // Create mixed structural and composed children in bulk
      const mixedMapItems = await mapItemRepo.createMany([
        {
          attrs: {
            parentId: parentItem.id,
            coords: _createTestCoordinates({
              userId: setupParams.userId,
              groupId: setupParams.groupId,
              path: [Direction.SouthEast, Direction.NorthEast], // Structural: positive
            }),
            ref: {
              itemType: MapItemType.BASE,
              itemId: baseItems[0]!.id,
            },
            itemType: MapItemType.BASE,
          },
          ref: baseItems[0]!,
        },
        {
          attrs: {
            parentId: parentItem.id,
            coords: _createTestCoordinates({
              userId: setupParams.userId,
              groupId: setupParams.groupId,
              path: [Direction.SouthEast, Direction.ComposedNorthWest], // Composed: negative
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
            parentId: parentItem.id,
            coords: _createTestCoordinates({
              userId: setupParams.userId,
              groupId: setupParams.groupId,
              path: [Direction.SouthEast, Direction.East], // Structural: positive
            }),
            ref: {
              itemType: MapItemType.BASE,
              itemId: baseItems[2]!.id,
            },
            itemType: MapItemType.BASE,
          },
          ref: baseItems[2]!,
        },
        {
          attrs: {
            parentId: parentItem.id,
            coords: _createTestCoordinates({
              userId: setupParams.userId,
              groupId: setupParams.groupId,
              path: [Direction.SouthEast, Direction.ComposedSouthEast], // Composed: negative
            }),
            ref: {
              itemType: MapItemType.BASE,
              itemId: baseItems[3]!.id,
            },
            itemType: MapItemType.BASE,
          },
          ref: baseItems[3]!,
        },
      ]);

      // Verify all 4 were created
      expect(mixedMapItems).toHaveLength(4);

      // Verify structural children have positive directions
      expect(mixedMapItems[0]!.attrs.coords.path[1]).toBeGreaterThan(0);
      expect(mixedMapItems[2]!.attrs.coords.path[1]).toBeGreaterThan(0);

      // Verify composed children have negative directions
      expect(mixedMapItems[1]!.attrs.coords.path[1]).toBeLessThan(0);
      expect(mixedMapItems[3]!.attrs.coords.path[1]).toBeLessThan(0);

      // Verify titles
      expect(mixedMapItems[0]!.ref.attrs.title).toBe("Structural NE");
      expect(mixedMapItems[1]!.ref.attrs.title).toBe("Composed NW");
      expect(mixedMapItems[2]!.ref.attrs.title).toBe("Structural E");
      expect(mixedMapItems[3]!.ref.attrs.title).toBe("Composed SE");
    });

    it("should handle deeply nested composed children in bulk", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      // Create deep hierarchy
      const level1Coords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.NorthWest],
      });
      const level1BaseItem = await testEnv.repositories.baseItem.create({
        attrs: {
          title: "Level 1",
          content: "First level",
          link: "",
          preview: undefined,
        },
        relatedItems: {},
        relatedLists: {},
      });
      const level1Item = await mapItemRepo.create({
        attrs: {
          parentId: rootMap.id,
          coords: level1Coords,
          ref: {
            itemType: MapItemType.BASE,
            itemId: level1BaseItem.id,
          },
          itemType: MapItemType.BASE,
        },
        relatedItems: {
          ref: level1BaseItem,
          parent: null,
        },
        relatedLists: {
          neighbors: [],
        },
      });

      const level2Coords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.NorthWest, Direction.East],
      });
      const level2BaseItem = await testEnv.repositories.baseItem.create({
        attrs: {
          title: "Level 2",
          content: "Second level",
          link: "",
          preview: undefined,
        },
        relatedItems: {},
        relatedLists: {},
      });
      const level2Item = await mapItemRepo.create({
        attrs: {
          parentId: level1Item.id,
          coords: level2Coords,
          ref: {
            itemType: MapItemType.BASE,
            itemId: level2BaseItem.id,
          },
          itemType: MapItemType.BASE,
        },
        relatedItems: {
          ref: level2BaseItem,
          parent: null,
        },
        relatedLists: {
          neighbors: [],
        },
      });

      // Create multiple composed children at deep level in bulk
      const deepComposedBaseItems = await testEnv.repositories.baseItem.createMany([
        { title: "Deep Composed W", content: "Deep W", link: "", preview: undefined },
        { title: "Deep Composed SW", content: "Deep SW", link: "", preview: undefined },
      ]);

      const deepComposedMapItems = await mapItemRepo.createMany([
        {
          attrs: {
            parentId: level2Item.id,
            coords: _createTestCoordinates({
              userId: setupParams.userId,
              groupId: setupParams.groupId,
              path: [Direction.NorthWest, Direction.East, Direction.ComposedWest],
            }),
            ref: {
              itemType: MapItemType.BASE,
              itemId: deepComposedBaseItems[0]!.id,
            },
            itemType: MapItemType.BASE,
          },
          ref: deepComposedBaseItems[0]!,
        },
        {
          attrs: {
            parentId: level2Item.id,
            coords: _createTestCoordinates({
              userId: setupParams.userId,
              groupId: setupParams.groupId,
              path: [Direction.NorthWest, Direction.East, Direction.ComposedSouthWest],
            }),
            ref: {
              itemType: MapItemType.BASE,
              itemId: deepComposedBaseItems[1]!.id,
            },
            itemType: MapItemType.BASE,
          },
          ref: deepComposedBaseItems[1]!,
        },
      ]);

      // Verify deep composed children
      expect(deepComposedMapItems).toHaveLength(2);
      expect(deepComposedMapItems[0]!.attrs.coords.path).toHaveLength(3);
      expect(deepComposedMapItems[1]!.attrs.coords.path).toHaveLength(3);

      // Verify negative directions at depth
      expect(deepComposedMapItems[0]!.attrs.coords.path[2]).toBe(Direction.ComposedWest);
      expect(deepComposedMapItems[1]!.attrs.coords.path[2]).toBe(Direction.ComposedSouthWest);
      expect(deepComposedMapItems[0]!.attrs.coords.path[2]).toBeLessThan(0);
      expect(deepComposedMapItems[1]!.attrs.coords.path[2]).toBeLessThan(0);
    });
  });
});
