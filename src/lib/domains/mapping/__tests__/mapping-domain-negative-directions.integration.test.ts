import { describe, beforeEach, it, expect } from "vitest";
import {
  type TestEnvironment,
  _cleanupDatabase,
  _createTestEnvironment,
  _createUniqueTestParams,
  _setupBasicMap,
} from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";
import { Direction, CoordSystem } from "~/lib/domains/mapping/utils";
import type { Coord } from "~/lib/domains/mapping/utils";

/**
 * Integration tests for Mapping Domain - Negative Direction Support
 *
 * These tests verify the ENTIRE mapping domain works together for negative directions:
 * 1. Utils layer - Direction enum and CoordSystem with negative directions
 * 2. Types layer - Parameter validation with negative directions
 * 3. Services layer - ItemQueryService composition methods
 * 4. Repository layer - MapItemRepository with negative direction queries
 * 5. Infrastructure layer - Database persistence and queries
 *
 * This is a TOP-LEVEL integration test that validates all 5 child subsystems
 * working together cohesively for the negative direction feature.
 */
describe("Mapping Domain - Negative Direction Integration", () => {
  let testEnv: TestEnvironment;

  beforeEach(async () => {
    await _cleanupDatabase();
    testEnv = _createTestEnvironment();
  });

  describe("Full Domain Integration - End to End", () => {
    it("should support complete negative direction workflow across all layers", async () => {
      // This test exercises all 5 subsystems in one workflow:
      // Utils → Types → Services → Repositories → Infrastructure

      // LAYER 1: Utils - Generate composed child coordinates
      const testParams = _createUniqueTestParams();
      const parentCoord: Coord = {
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthWest],
      };

      // Test utils layer: getComposedChildCoords
      const composedCoords = CoordSystem.getComposedChildCoords(parentCoord);
      expect(composedCoords).toHaveLength(6);
      expect(composedCoords[0]?.path).toEqual([Direction.NorthWest, Direction.ComposedNorthWest]);

      // LAYER 2: Types - Validate coordinates through parameter schema
      const parentCoordsId = CoordSystem.createId(parentCoord);

      // Setup: Create parent tile
      const rootMap = await _setupBasicMap(testEnv.service, testParams);
      const rootItem = rootMap.items[0];
      if (!rootItem) throw new Error("Root item not found");

      const parentItem = await testEnv.service.items.crud.addItemToMap({
        coords: parentCoord,
        title: "Parent Tile",
        content: "Parent content",
        parentId: rootMap.id,
      });

      // LAYER 3: Services - Create composed children through service layer
      // This validates Types layer (parameter validation) automatically
      const [composedCoord1, composedCoord2] = composedCoords;
      if (!composedCoord1 || !composedCoord2) throw new Error("Expected composed coords");

      await testEnv.service.items.crud.addItemToMap({
        coords: composedCoord1,
        title: "Composed Child 1",
        content: "First composed child",
        parentId: parseInt(parentItem.id),
      });

      await testEnv.service.items.crud.addItemToMap({
        coords: composedCoord2,
        title: "Composed Child 2",
        content: "Second composed child",
        parentId: parseInt(parentItem.id),
      });

      // Test service layer: hasComposition
      const hasComp = await testEnv.service.items.query.hasComposition({
        coordId: parentCoordsId,
      });
      expect(hasComp).toBe(true);

      // Test service layer: getComposedChildren
      const retrievedComposed = await testEnv.service.items.query.getComposedChildren({
        coordId: parentCoordsId,
      });
      expect(retrievedComposed).toHaveLength(2);
      expect(retrievedComposed.map(item => item.title)).toEqual(
        expect.arrayContaining(["Composed Child 1", "Composed Child 2"])
      );

      // LAYER 4: Repositories - Verify repository methods work
      const parentFromRepo = await testEnv.repositories.mapItem.getOneByIdr({
        idr: { attrs: { coords: parentCoord } }
      });
      expect(parentFromRepo).toBeDefined();

      // LAYER 5: Infrastructure - Verify database persistence
      // getComposedChildren already hit the database through the full stack
      // Now verify the coords were stored correctly with negative directions
      const child1FromDb = await testEnv.repositories.mapItem.getOneByIdr({
        idr: { attrs: { coords: composedCoords[0] } }
      });
      expect(child1FromDb).toBeDefined();
      expect(child1FromDb.attrs.coords).toEqual(composedCoords[0]);

      // Verify the path contains negative direction
      expect(child1FromDb.attrs.coords.path[child1FromDb.attrs.coords.path.length - 1]).toBe(Direction.ComposedNorthWest);
      expect(child1FromDb.attrs.coords.path[child1FromDb.attrs.coords.path.length - 1]).toBe(-1);
    });

    it("should correctly distinguish structural children from composed children", async () => {
      // Setup parent tile
      const testParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, testParams);
      const rootItem = rootMap.items[0];
      if (!rootItem) throw new Error("Root item not found");

      const parentCoord: Coord = {
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthWest],
      };

      const parentItem = await testEnv.service.items.crud.addItemToMap({
        coords: parentCoord,
        title: "Parent Tile",
        content: "Parent content",
        parentId: rootMap.id,
      });

      // Create structural child (positive direction)
      const structuralChildCoord: Coord = {
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthWest, Direction.East],
      };

      await testEnv.service.items.crud.addItemToMap({
        coords: structuralChildCoord,
        title: "Structural Child",
        content: "Regular child",
        parentId: parseInt(parentItem.id),
      });

      // Create composed child (negative direction)
      const composedChildCoord: Coord = {
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthWest, Direction.ComposedEast],
      };

      await testEnv.service.items.crud.addItemToMap({
        coords: composedChildCoord,
        title: "Composed Child",
        content: "Composed child",
        parentId: parseInt(parentItem.id),
      });

      const parentCoordsId = CoordSystem.createId(parentCoord);

      // Verify structural children don't include composed
      const descendants = await testEnv.service.items.query.getDescendants({
        itemId: parseInt(parentItem.id),
        includeComposition: false,
      });
      expect(descendants.map(d => d.title)).toContain("Structural Child");
      expect(descendants.map(d => d.title)).not.toContain("Composed Child");

      // Verify composed children query
      const composedChildren = await testEnv.service.items.query.getComposedChildren({
        coordId: parentCoordsId,
      });
      expect(composedChildren.map(c => c.title)).toContain("Composed Child");
      expect(composedChildren.map(c => c.title)).not.toContain("Structural Child");

      // Verify includeComposition flag works
      const allDescendants = await testEnv.service.items.query.getDescendants({
        itemId: parseInt(parentItem.id),
        includeComposition: true,
      });
      expect(allDescendants.map(d => d.title)).toContain("Structural Child");
      expect(allDescendants.map(d => d.title)).toContain("Composed Child");
    });

    it("should support deep copy of tiles with composed children", async () => {
      // Setup source tile with composed children
      const testParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, testParams);
      const rootItem = rootMap.items[0];
      if (!rootItem) throw new Error("Root item not found");

      const sourceCoord: Coord = {
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthWest],
      };

      const sourceItem = await testEnv.service.items.crud.addItemToMap({
        coords: sourceCoord,
        title: "Source Tile",
        content: "Source content",
        parentId: parseInt(rootItem.id),
      });

      // Add composed child
      const composedChildCoord: Coord = {
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthWest, Direction.ComposedEast],
      };

      await testEnv.service.items.crud.addItemToMap({
        coords: composedChildCoord,
        title: "Composed Child",
        content: "Composed content",
        parentId: parseInt(sourceItem.id),
      });

      // Deep copy to destination
      const destCoord: Coord = {
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.East],
      };

      await testEnv.service.items.deepCopyMapItem({
        sourceCoords: sourceCoord,
        destinationCoords: destCoord,
        destinationParentId: parseInt(rootItem.id),
      });

      // Verify composed child was copied
      const destComposedChildCoord: Coord = {
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.East, Direction.ComposedEast],
      };

      const copiedComposed = await testEnv.repositories.mapItem.getOneByIdr({
        idr: { attrs: { coords: destComposedChildCoord } }
      });
      expect(copiedComposed).toBeDefined();
      expect(copiedComposed.ref.attrs.title).toBe("Composed Child");

      // Verify negative direction is preserved
      expect(copiedComposed.attrs.coords.path[copiedComposed.attrs.coords.path.length - 1]).toBe(Direction.ComposedEast);
    });

    it("should handle all 6 composed children slots", async () => {
      // Test creating all 6 composed children using negative directions -1 to -6
      const testParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, testParams);
      const rootItem = rootMap.items[0];
      if (!rootItem) throw new Error("Root item not found");

      const parentCoord: Coord = {
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthWest],
      };

      const parentItem = await testEnv.service.items.crud.addItemToMap({
        coords: parentCoord,
        title: "Parent Tile",
        content: "Parent content",
        parentId: parseInt(rootItem.id),
      });

      // Create all 6 composed children
      const composedCoords = CoordSystem.getComposedChildCoords(parentCoord);
      const expectedDirections = [
        Direction.ComposedNorthWest,
        Direction.ComposedNorthEast,
        Direction.ComposedEast,
        Direction.ComposedSouthEast,
        Direction.ComposedSouthWest,
        Direction.ComposedWest,
      ];

      for (let i = 0; i < 6; i++) {
        await testEnv.service.items.crud.addItemToMap({
          coords: composedCoords[i]!,
          title: `Composed Child ${i + 1}`,
          content: `Child in direction ${expectedDirections[i]}`,
          parentId: parseInt(parentItem.id),
        });
      }

      // Verify all 6 were created
      const parentCoordsId = CoordSystem.createId(parentCoord);
      const allComposed = await testEnv.service.items.query.getComposedChildren({
        coordId: parentCoordsId,
      });

      expect(allComposed).toHaveLength(6);
      expect(allComposed.map(c => c.title)).toEqual(
        expect.arrayContaining([
          "Composed Child 1",
          "Composed Child 2",
          "Composed Child 3",
          "Composed Child 4",
          "Composed Child 5",
          "Composed Child 6",
        ])
      );

      // Verify each has correct negative direction
      for (let i = 0; i < 6; i++) {
        const child = await testEnv.repositories.mapItem.getOneByIdr({
          idr: { attrs: { coords: composedCoords[i]! } }
        });
        expect(child.attrs.coords.path[child.attrs.coords.path.length - 1]).toBe(expectedDirections[i]);
        expect(child.attrs.coords.path[child.attrs.coords.path.length - 1]).toBe(-(i + 1));
      }
    });

    it("should support nested composed children (composed child containing its own composition)", async () => {
      // Test multi-level composition: Parent → Composed Child → Nested Composed Child
      const testParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, testParams);
      const rootItem = rootMap.items[0];
      if (!rootItem) throw new Error("Root item not found");

      // Level 1: Parent
      const parentCoord: Coord = {
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthWest],
      };

      const parentItem = await testEnv.service.items.crud.addItemToMap({
        coords: parentCoord,
        title: "Parent",
        content: "Parent content",
        parentId: parseInt(rootItem.id),
      });

      // Level 2: Composed child of parent
      const composedChildCoord: Coord = {
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthWest, Direction.ComposedEast],
      };

      const composedChildItem = await testEnv.service.items.crud.addItemToMap({
        coords: composedChildCoord,
        title: "Composed Child",
        content: "Composed content",
        parentId: parseInt(parentItem.id),
      });

      // Level 3: Composed child of composed child (nested)
      const nestedComposedCoord: Coord = {
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthWest, Direction.ComposedEast, Direction.ComposedSouthWest],
      };

      await testEnv.service.items.crud.addItemToMap({
        coords: nestedComposedCoord,
        title: "Nested Composed Child",
        content: "Nested composed content",
        parentId: parseInt(composedChildItem.id),
      });

      // Verify parent has composed child
      const parentCoordsId = CoordSystem.createId(parentCoord);
      const parentComposed = await testEnv.service.items.query.getComposedChildren({
        coordId: parentCoordsId,
      });
      expect(parentComposed).toHaveLength(1);
      expect(parentComposed[0]?.title).toBe("Composed Child");

      // Verify composed child has its own composed child
      const composedChildCoordsId = CoordSystem.createId(composedChildCoord);
      const nestedComposed = await testEnv.service.items.query.getComposedChildren({
        coordId: composedChildCoordsId,
      });
      expect(nestedComposed).toHaveLength(1);
      expect(nestedComposed[0]?.title).toBe("Nested Composed Child");

      // Verify nested coord has multiple negative directions
      const nestedFromDb = await testEnv.repositories.mapItem.getOneByIdr({
        idr: { attrs: { coords: nestedComposedCoord } }
      });
      expect(nestedFromDb.attrs.coords.path).toEqual([
        Direction.NorthWest,
        Direction.ComposedEast,
        Direction.ComposedSouthWest,
      ]);
      expect(nestedFromDb.attrs.coords.path).toEqual([1, -3, -5]);
    });
  });

  describe("Utils ↔ Types Integration", () => {
    it("should correctly serialize and validate negative direction coordinates", () => {
      // Test that utils serialization works with types validation
      const coord: Coord = {
        userId: "user-test-1",
        groupId: 0,
        path: [Direction.NorthWest, Direction.ComposedEast, Direction.SouthEast],
      };

      // Utils layer: serialize
      const coordId = CoordSystem.createId(coord);
      expect(coordId).toBe("user-test-1,0:1,-3,4");

      // Utils layer: deserialize
      const parsed = CoordSystem.parseId(coordId);
      expect(parsed).toEqual(coord);

      // Types layer would validate this through parameter schemas
      // (tested implicitly in service calls above)
    });

    it("should identify composed children correctly across utils functions", () => {
      const composedCoord: Coord = {
        userId: "user-test-1",
        groupId: 0,
        path: [Direction.NorthWest, Direction.ComposedEast],
      };

      const structuralCoord: Coord = {
        userId: "user-test-1",
        groupId: 0,
        path: [Direction.NorthWest, Direction.East],
      };

      // Utils layer detection functions
      expect(CoordSystem.isComposedChild(composedCoord)).toBe(true);
      expect(CoordSystem.isComposedChild(structuralCoord)).toBe(false);

      const composedId = CoordSystem.createId(composedCoord);
      const structuralId = CoordSystem.createId(structuralCoord);

      expect(CoordSystem.isComposedChildId(composedId)).toBe(true);
      expect(CoordSystem.isComposedChildId(structuralId)).toBe(false);
    });
  });

  describe("Services ↔ Repositories ↔ Infrastructure Integration", () => {
    it("should correctly query composed children through all layers", async () => {
      // Setup
      const testParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, testParams);
      const rootItem = rootMap.items[0];
      if (!rootItem) throw new Error("Root item not found");

      const parentCoord: Coord = {
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthWest],
      };

      const parentItem = await testEnv.service.items.crud.addItemToMap({
        coords: parentCoord,
        title: "Parent",
        content: "Parent content",
        parentId: parseInt(rootItem.id),
      });

      const composedCoord: Coord = {
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthWest, Direction.ComposedEast],
      };

      await testEnv.service.items.crud.addItemToMap({
        coords: composedCoord,
        title: "Composed Child",
        content: "Composed content",
        parentId: parseInt(parentItem.id),
      });

      // Service layer query
      const parentCoordsId = CoordSystem.createId(parentCoord);
      const serviceResult = await testEnv.service.items.query.getComposedChildren({
        coordId: parentCoordsId,
      });
      expect(serviceResult).toHaveLength(1);

      // Repository layer query (through getContextForCenter)
      const repoResult = await testEnv.repositories.mapItem.getContextForCenter({
        centerPath: parentCoord.path,
        userId: String(testParams.userId),
        groupId: testParams.groupId,
        includeParent: false,
        includeComposed: true,
        includeChildren: false,
        includeGrandchildren: false,
      });
      expect(repoResult.composed).toHaveLength(1);
      expect(repoResult.composed[0]?.ref.attrs.title).toBe("Composed Child");

      // Verify same data through both paths
      expect(serviceResult[0]?.title).toBe(repoResult.composed[0]?.ref.attrs.title);
    });
  });

  describe("Backwards Compatibility", () => {
    it("should not affect existing structural children (directions 1-6)", async () => {
      // Verify that negative directions don't break existing positive direction behavior
      const testParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, testParams);
      const rootItem = rootMap.items[0];
      if (!rootItem) throw new Error("Root item not found");

      const parentCoord: Coord = {
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthWest],
      };

      const parentItem = await testEnv.service.items.crud.addItemToMap({
        coords: parentCoord,
        title: "Parent",
        content: "Parent content",
        parentId: parseInt(rootItem.id),
      });

      // Create structural children (traditional behavior)
      const structuralDirections = [
        Direction.NorthWest,
        Direction.NorthEast,
        Direction.East,
        Direction.SouthEast,
        Direction.SouthWest,
        Direction.West,
      ];

      for (let i = 0; i < 6; i++) {
        const childCoord: Coord = {
          userId: testParams.userId,
          groupId: testParams.groupId,
          path: [Direction.NorthWest, structuralDirections[i]!],
        };

        await testEnv.service.items.crud.addItemToMap({
          coords: childCoord,
          title: `Structural Child ${i + 1}`,
          content: `Child in direction ${structuralDirections[i]}`,
          parentId: parseInt(parentItem.id),
        });
      }

      // Verify structural children work as before
      const descendants = await testEnv.service.items.query.getDescendants({
        itemId: parseInt(parentItem.id),
        includeComposition: false,
      });

      expect(descendants).toHaveLength(6);
      expect(descendants.map(d => d.title)).toEqual(
        expect.arrayContaining([
          "Structural Child 1",
          "Structural Child 2",
          "Structural Child 3",
          "Structural Child 4",
          "Structural Child 5",
          "Structural Child 6",
        ])
      );

      // Verify no composed children exist
      const parentCoordsId = CoordSystem.createId(parentCoord);
      const composed = await testEnv.service.items.query.getComposedChildren({
        coordId: parentCoordsId,
      });
      expect(composed).toHaveLength(0);
    });
  });
});
