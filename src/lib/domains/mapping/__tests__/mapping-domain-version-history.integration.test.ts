import { describe, beforeEach, it, expect } from "vitest";
import {
  type TestEnvironment,
  _cleanupDatabase,
  _createTestEnvironment,
  _createUniqueTestParams,
  _setupMapWithChild,
  createTestItem,
} from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";
import { Direction } from "~/lib/domains/mapping/utils";

/**
 * Integration tests for Mapping Domain - Version History Feature
 *
 * These tests verify the ENTIRE mapping domain works together for version history:
 * 1. Public API exports (index.ts)
 * 2. Service layer orchestration (MappingService → ItemHistoryService)
 * 3. Repository layer (BaseItemRepository version methods)
 * 4. Infrastructure layer (DbBaseItemRepository with database)
 * 5. Domain objects (BaseItemVersion)
 *
 * This is a TOP-LEVEL integration test that validates all subsystems working together.
 */
describe("Mapping Domain - Version History Integration", () => {
  let testEnv: TestEnvironment;

  beforeEach(async () => {
    await _cleanupDatabase();
    testEnv = _createTestEnvironment();
  });

  describe("Full Domain Integration", () => {
    it("should support complete version history workflow through MappingService", async () => {
      // Arrange: Create a map and tile
      const testParams = _createUniqueTestParams();
      const { childCoords } = await _setupMapWithChild(testEnv.service, {
        ...testParams,
        childTitle: "Original Title",
      });

      // Act: Perform multiple updates
      await testEnv.service.items.crud.updateItem({
        coords: childCoords,
        title: "Update 1",
        content: "Content 1",
      });

      await testEnv.service.items.crud.updateItem({
        coords: childCoords,
        title: "Update 2",
        content: "Content 2",
        preview: "Preview 2",
      });

      await testEnv.service.items.crud.updateItem({
        coords: childCoords,
        title: "Final Update",
        content: "Final Content",
        link: "https://final.example.com",
      });

      // Act: Retrieve version history
      const history = await testEnv.service.items.history.getItemHistory({
        coords: childCoords,
      });

      // Assert: Verify complete integration
      expect(history).toBeDefined();
      expect(history.coords).toEqual(childCoords);
      expect(history.currentVersion.title).toBe("Final Update");
      expect(history.versions.length).toBeGreaterThanOrEqual(3);

      // Versions should be in descending order (newest first)
      const versionNumbers = history.versions.map(v => v.versionNumber);
      for (let i = 0; i < versionNumbers.length - 1; i++) {
        expect(versionNumbers[i]).toBeGreaterThan(versionNumbers[i + 1] ?? 0);
      }

      // Should be able to retrieve specific version
      const version1 = await testEnv.service.items.history.getItemVersion({
        coords: childCoords,
        versionNumber: 1,
      });
      expect(version1.title).toBe("Original Title");
    });

    it("should maintain version history across complex operations", async () => {
      // Arrange: Create map with multiple tiles
      const testParams = _createUniqueTestParams();
      const { rootMap } = await _setupMapWithChild(testEnv.service, testParams);

      // Use different directions to avoid conflicts
      const tile1Coords = {
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.SouthWest],
      };

      const tile2Coords = {
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.West],
      };

      // Create two tiles with content
      await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: tile1Coords,
        title: "Tile 1 Initial",
        content: "Content 1",
      });

      await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: tile2Coords,
        title: "Tile 2 Initial",
        content: "Content 2",
      });

      // Update both tiles multiple times
      await testEnv.service.items.crud.updateItem({
        coords: tile1Coords,
        title: "Tile 1 Updated",
      });

      await testEnv.service.items.crud.updateItem({
        coords: tile2Coords,
        title: "Tile 2 Updated",
      });

      // Act: Get history for both tiles
      const history1 = await testEnv.service.items.history.getItemHistory({
        coords: tile1Coords,
      });

      const history2 = await testEnv.service.items.history.getItemHistory({
        coords: tile2Coords,
      });

      // Assert: Each tile maintains independent version history
      expect(history1.versions.length).toBeGreaterThan(0);
      expect(history2.versions.length).toBeGreaterThan(0);

      // Version histories should be independent
      expect(history1.currentVersion.title).toBe("Tile 1 Updated");
      expect(history2.currentVersion.title).toBe("Tile 2 Updated");

      // Original versions should still be retrievable
      const tile1Original = await testEnv.service.items.history.getItemVersion({
        coords: tile1Coords,
        versionNumber: 1,
      });

      const tile2Original = await testEnv.service.items.history.getItemVersion({
        coords: tile2Coords,
        versionNumber: 1,
      });

      expect(tile1Original.title).toBe("Tile 1 Initial");
      expect(tile2Original.title).toBe("Tile 2 Initial");
    });

    it("should handle version history with pagination", async () => {
      // Arrange: Create tile with many versions
      const testParams = _createUniqueTestParams();
      const { childCoords } = await _setupMapWithChild(testEnv.service, testParams);

      // Create 20 versions
      for (let i = 1; i <= 20; i++) {
        await testEnv.service.items.crud.updateItem({
          coords: childCoords,
          title: `Version ${i}`,
          content: `Content ${i}`,
        });
      }

      // Act: Get paginated history
      const page1 = await testEnv.service.items.history.getItemHistory({
        coords: childCoords,
        limit: 5,
        offset: 0,
      });

      const page2 = await testEnv.service.items.history.getItemHistory({
        coords: childCoords,
        limit: 5,
        offset: 5,
      });

      const page3 = await testEnv.service.items.history.getItemHistory({
        coords: childCoords,
        limit: 5,
        offset: 10,
      });

      // Assert: Pagination works correctly
      expect(page1.versions).toHaveLength(5);
      expect(page2.versions).toHaveLength(5);
      expect(page3.versions).toHaveLength(5);

      expect(page1.hasMore).toBe(true);
      expect(page2.hasMore).toBe(true);

      // Pages should not overlap
      const page1Numbers = page1.versions.map(v => v.versionNumber);
      const page2Numbers = page2.versions.map(v => v.versionNumber);
      const page3Numbers = page3.versions.map(v => v.versionNumber);

      const allNumbers = [...page1Numbers, ...page2Numbers, ...page3Numbers];
      const uniqueNumbers = new Set(allNumbers);
      expect(uniqueNumbers.size).toBe(allNumbers.length);
    });

    it("should preserve version history when tile is moved", async () => {
      // Arrange: Create tile and build version history
      const testParams = _createUniqueTestParams();
      const { childCoords } = await _setupMapWithChild(testEnv.service, {
        ...testParams,
        childTitle: "Original at NE",
      });

      // Build version history
      await testEnv.service.items.crud.updateItem({
        coords: childCoords,
        title: "Updated at NE",
        content: "Still at NE",
      });

      await testEnv.service.items.crud.updateItem({
        coords: childCoords,
        title: "Final at NE",
        content: "About to move",
      });

      // Get history before move
      const historyBeforeMove = await testEnv.service.items.history.getItemHistory({
        coords: childCoords,
      });

      // Act: Move the tile to different direction
      const newCoords = {
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.SouthWest],
      };

      await testEnv.service.items.crud.moveMapItem({
        oldCoords: childCoords,
        newCoords,
      });

      // Get history after move
      const historyAfterMove = await testEnv.service.items.history.getItemHistory({
        coords: newCoords,
      });

      // Assert: Version history preserved after move
      expect(historyAfterMove.versions.length).toBe(historyBeforeMove.versions.length);

      // Can still retrieve original version
      const originalVersion = await testEnv.service.items.history.getItemVersion({
        coords: newCoords,
        versionNumber: 1,
      });

      expect(originalVersion.title).toBe("Original at NE");
    });

    it("should handle errors gracefully with descriptive messages", async () => {
      // Arrange: Non-existent coordinates
      const testParams = _createUniqueTestParams();
      const nonExistentCoords = {
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.East, Direction.West, Direction.NorthWest],
      };

      // Act & Assert: Should throw descriptive error
      await expect(
        testEnv.service.items.history.getItemHistory({
          coords: nonExistentCoords,
        })
      ).rejects.toThrow(/not found/);

      // Act & Assert: Non-existent version number
      const { childCoords } = await _setupMapWithChild(testEnv.service, testParams);

      await expect(
        testEnv.service.items.history.getItemVersion({
          coords: childCoords,
          versionNumber: 999,
        })
      ).rejects.toThrow();
    });
  });

  describe("Cross-Subsystem Integration", () => {
    it("should integrate version history with item CRUD operations", async () => {
      // This test verifies that ItemCrudService and ItemHistoryService
      // work together seamlessly through MappingService

      const testParams = _createUniqueTestParams();
      const { childCoords } = await _setupMapWithChild(testEnv.service, testParams);

      // ItemCrudService operations should create version history
      await testEnv.service.items.crud.updateItem({
        coords: childCoords,
        title: "CRUD Update 1",
      });

      // ItemHistoryService should see the changes
      const history = await testEnv.service.items.history.getItemHistory({
        coords: childCoords,
      });

      expect(history.currentVersion.title).toBe("CRUD Update 1");
      expect(history.versions.length).toBeGreaterThan(0);
    });

    it("should integrate with coordinate-based queries", async () => {
      // This test verifies that coordinate system and version history
      // work together correctly

      const testParams = _createUniqueTestParams();
      const { childCoords } = await _setupMapWithChild(testEnv.service, testParams);

      // Update the child tile
      await testEnv.service.items.crud.updateItem({
        coords: childCoords,
        title: "Child Updated",
      });

      // Version history should work for coordinate paths
      const childHistory = await testEnv.service.items.history.getItemHistory({
        coords: childCoords,
      });

      expect(childHistory.coords).toEqual(childCoords);
      expect(childHistory.currentVersion.title).toBe("Child Updated");

      // Can also get history for the root
      const rootCoords = {
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [],
      };

      await testEnv.service.items.crud.updateItem({
        coords: rootCoords,
        title: "Root Updated",
      });

      const rootHistory = await testEnv.service.items.history.getItemHistory({
        coords: rootCoords,
      });

      expect(rootHistory.coords).toEqual(rootCoords);
      expect(rootHistory.currentVersion.title).toBe("Root Updated");
    });
  });

  describe("Domain Object Integration", () => {
    it("should return proper BaseItemVersion domain objects", async () => {
      // This test verifies that domain objects flow correctly through all layers

      const testParams = _createUniqueTestParams();
      const { childCoords } = await _setupMapWithChild(testEnv.service, {
        ...testParams,
        childTitle: "Test Title",
      });

      // Add content via update
      await testEnv.service.items.crud.updateItem({
        coords: childCoords,
        title: "Test Title",
        content: "Test Content",
      });

      await testEnv.service.items.crud.updateItem({
        coords: childCoords,
        title: "Updated Title",
        content: "Updated Content",
      });

      const history = await testEnv.service.items.history.getItemHistory({
        coords: childCoords,
      });

      // Verify domain object structure
      expect(history.versions.length).toBeGreaterThan(0);
      const version = history.versions[0];
      expect(version).toBeDefined();
      expect(version!.versionNumber).toBeDefined();
      expect(version!.title).toBeDefined();
      expect(version!.content).toBeDefined();
      expect(version!.createdAt).toBeInstanceOf(Date);

      // Optional fields should exist in the structure
      expect(version).toHaveProperty("preview");
      expect(version).toHaveProperty("link");

      // Verify we can get a specific version which includes all fields
      const specificVersion = await testEnv.service.items.history.getItemVersion({
        coords: childCoords,
        versionNumber: 2, // Version 2 = first update which saved empty content state
      });

      expect(specificVersion.title).toBe("Test Title");
      expect(specificVersion.content).toBe(""); // Was empty before first update
      expect(specificVersion.versionNumber).toBe(2);
    });
  });

  describe("Transactional Integrity", () => {
    it("should maintain version history transactional integrity", async () => {
      // This test verifies that version creation and item update
      // happen atomically (both succeed or both fail)

      const testParams = _createUniqueTestParams();
      const { childCoords } = await _setupMapWithChild(testEnv.service, testParams);

      // Perform successful update
      await testEnv.service.items.crud.updateItem({
        coords: childCoords,
        title: "Valid Update",
      });

      // Verify version was created
      const history = await testEnv.service.items.history.getItemHistory({
        coords: childCoords,
      });

      expect(history.versions.length).toBeGreaterThan(0);

      // If an update fails, version should not be created
      // (This is tested in infrastructure layer, but we verify the integration here)
      const versionCountBefore = history.versions.length;

      // Try to update non-existent item (should fail)
      const badCoords = {
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.West, Direction.West, Direction.West],
      };

      await expect(
        testEnv.service.items.crud.updateItem({
          coords: badCoords,
          title: "Should Fail",
        })
      ).rejects.toThrow();

      // Original item's version count should be unchanged
      const historyAfterFailure = await testEnv.service.items.history.getItemHistory({
        coords: childCoords,
      });

      expect(historyAfterFailure.versions.length).toBe(versionCountBefore);
    });
  });
});
