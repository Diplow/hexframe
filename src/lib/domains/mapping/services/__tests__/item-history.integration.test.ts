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

describe("ItemHistoryService [Integration - DB]", () => {
  let testEnv: TestEnvironment;

  beforeEach(async () => {
    await _cleanupDatabase();
    testEnv = _createTestEnvironment();
  });

  describe("getItemHistory", () => {
    it("should return version history for a tile", async () => {
      // Arrange: Create a tile and update it multiple times
      const testParams = _createUniqueTestParams();
      const { childCoords } = await _setupMapWithChild(testEnv.service, testParams);

      // Update the item to create version history
      await testEnv.service.items.crud.updateItem({
        coords: childCoords,
        title: "Updated Title 1",
        content: "Updated Content 1",
      });

      await testEnv.service.items.crud.updateItem({
        coords: childCoords,
        title: "Updated Title 2",
        content: "Updated Content 2",
      });

      // Act: Get version history
      const history = await testEnv.service.items.history.getItemHistory({
        coords: childCoords,
      });

      // Assert: Verify history structure
      expect(history).toBeDefined();
      expect(history.coords).toEqual(childCoords);
      expect(history.currentVersion).toBeDefined();
      expect(history.versions).toBeDefined();
      expect(history.versions.length).toBeGreaterThan(0);

      // Versions should be ordered newest first
      expect(history.versions[0]?.versionNumber).toBeGreaterThan(
        history.versions[history.versions.length - 1]?.versionNumber ?? 0
      );
    });

    it("should support pagination with limit and offset", async () => {
      // Arrange: Create a tile with many versions
      const testParams = _createUniqueTestParams();
      const { childCoords } = await _setupMapWithChild(testEnv.service, testParams);

      // Create 10 versions
      for (let i = 1; i <= 10; i++) {
        await testEnv.service.items.crud.updateItem({
          coords: childCoords,
          title: `Version ${i}`,
          content: `Content ${i}`,
        });
      }

      // Act: Get first page
      const page1 = await testEnv.service.items.history.getItemHistory({
        coords: childCoords,
        limit: 3,
        offset: 0,
      });

      // Act: Get second page
      const page2 = await testEnv.service.items.history.getItemHistory({
        coords: childCoords,
        limit: 3,
        offset: 3,
      });

      // Assert: Verify pagination
      expect(page1.versions).toHaveLength(3);
      expect(page2.versions).toHaveLength(3);
      expect(page1.hasMore).toBe(true);

      // Verify pages don't overlap
      expect(page1.versions[0]?.versionNumber).not.toBe(
        page2.versions[0]?.versionNumber
      );
    });

    it("should return hasMore as false when no more versions", async () => {
      // Arrange: Create a tile with few versions
      const testParams = _createUniqueTestParams();
      const { childCoords } = await _setupMapWithChild(testEnv.service, testParams);

      // Create only 2 additional versions
      await testEnv.service.items.crud.updateItem({
        coords: childCoords,
        title: "Version 1",
      });

      // Act: Get history with high limit
      const history = await testEnv.service.items.history.getItemHistory({
        coords: childCoords,
        limit: 50,
      });

      // Assert: hasMore should be false
      expect(history.hasMore).toBe(false);
    });

    it("should throw error when MapItem not found at coordinates", async () => {
      // Arrange: Create coordinates that don't exist
      const testParams = _createUniqueTestParams();
      const nonExistentCoords = {
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.East, Direction.West, Direction.NorthWest],
      };

      // Act & Assert: Should throw error (repository throws its own error format)
      await expect(
        testEnv.service.items.history.getItemHistory({
          coords: nonExistentCoords,
        })
      ).rejects.toThrow(/not found/);
    });

    it("should include full coordinates in error message", async () => {
      // Arrange: Create specific coordinates
      const testParams = _createUniqueTestParams();
      const coords = {
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.East, Direction.SouthEast],
      };

      // Act & Assert: Error should include coordinate context
      await expect(
        testEnv.service.items.history.getItemHistory({ coords })
      ).rejects.toThrow(/coords/);
    });

    it("should return current version matching the latest tile state", async () => {
      // Arrange: Create and update a tile
      const testParams = _createUniqueTestParams();
      const { childCoords } = await _setupMapWithChild(testEnv.service, testParams);

      const latestUpdate = {
        coords: childCoords,
        title: "Latest Title",
        content: "Latest Content",
        link: "https://latest.example.com",
      };
      await testEnv.service.items.crud.updateItem(latestUpdate);

      // Act: Get history
      const history = await testEnv.service.items.history.getItemHistory({
        coords: childCoords,
      });

      // Assert: Current version should match latest state
      expect(history.currentVersion.title).toBe(latestUpdate.title);
      expect(history.currentVersion.content).toBe(latestUpdate.content);
      expect(history.currentVersion.link).toBe(latestUpdate.link);
    });
  });

  describe("getItemVersion", () => {
    it("should retrieve a specific version by version number", async () => {
      // Arrange: Create a tile and update it
      const testParams = _createUniqueTestParams();
      const { childCoords } = await _setupMapWithChild(testEnv.service, {
        ...testParams,
        childTitle: "Initial Title",
      });

      // Update to create version 2
      await testEnv.service.items.crud.updateItem({
        coords: childCoords,
        title: "Updated Title",
      });

      // Act: Get version 1 (initial state)
      const version1 = await testEnv.service.items.history.getItemVersion({
        coords: childCoords,
        versionNumber: 1,
      });

      // Assert: Should return the initial state
      expect(version1).toBeDefined();
      expect(version1.versionNumber).toBe(1);
      expect(version1.title).toBe("Initial Title");
    });

    it("should throw error when version number not found", async () => {
      // Arrange: Create a tile (which only has version 1)
      const testParams = _createUniqueTestParams();
      const { childCoords } = await _setupMapWithChild(testEnv.service, testParams);

      // Act & Assert: Should throw error for non-existent version
      await expect(
        testEnv.service.items.history.getItemVersion({
          coords: childCoords,
          versionNumber: 999,
        })
      ).rejects.toThrow();
    });

    it("should throw error when MapItem not found at coordinates", async () => {
      // Arrange: Create coordinates that don't exist
      const testParams = _createUniqueTestParams();
      const nonExistentCoords = {
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.West, Direction.West],
      };

      // Act & Assert: Should throw error
      await expect(
        testEnv.service.items.history.getItemVersion({
          coords: nonExistentCoords,
          versionNumber: 1,
        })
      ).rejects.toThrow(/not found/);
    });

    it("should preserve all fields in version snapshot", async () => {
      // Arrange: Create a tile with all fields populated
      const testParams = _createUniqueTestParams();
      const { rootMap } = await _setupMapWithChild(testEnv.service, testParams);

      const childCoords = {
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthWest],
      };

      await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: childCoords,
        title: "Complete Item",
        content: "Full description",
        preview: "Short preview",
        link: "https://example.com",
      });

      // Act: Get the version
      const version = await testEnv.service.items.history.getItemVersion({
        coords: childCoords,
        versionNumber: 1,
      });

      // Assert: All fields should be preserved
      expect(version.title).toBe("Complete Item");
      expect(version.content).toBe("Full description");
      expect(version.preview).toBe("Short preview");
      expect(version.link).toBe("https://example.com");
      expect(version.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("version history integration", () => {
    it("should track multiple updates in chronological order", async () => {
      // Arrange: Create a tile and track updates
      const testParams = _createUniqueTestParams();
      const { childCoords } = await _setupMapWithChild(testEnv.service, {
        ...testParams,
        childTitle: "v1",
      });

      const updates = [
        { title: "v2", content: "Update 2" },
        { title: "v3", content: "Update 3" },
        { title: "v4", content: "Update 4" },
      ];

      for (const update of updates) {
        await testEnv.service.items.crud.updateItem({
          coords: childCoords,
          ...update,
        });
      }

      // Act: Get full history
      const history = await testEnv.service.items.history.getItemHistory({
        coords: childCoords,
        limit: 50,
      });

      // Assert: Should have all versions in reverse chronological order
      expect(history.versions.length).toBeGreaterThanOrEqual(updates.length);

      // Newest first
      const versionNumbers = history.versions.map(v => v.versionNumber);
      for (let i = 0; i < versionNumbers.length - 1; i++) {
        expect(versionNumbers[i]).toBeGreaterThan(versionNumbers[i + 1] ?? 0);
      }
    });

    it("should maintain version integrity across tile moves", async () => {
      // Arrange: Create a tile, update it, then move it
      const testParams = _createUniqueTestParams();
      const { childCoords } = await _setupMapWithChild(testEnv.service, {
        ...testParams,
        childTitle: "Original Title",
      });

      // Update to create version history
      await testEnv.service.items.crud.updateItem({
        coords: childCoords,
        title: "Updated Title",
      });

      // Move the tile to a different direction under same parent
      const newCoords = {
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.SouthWest],
      };

      await testEnv.service.items.crud.moveMapItem({
        oldCoords: childCoords,
        newCoords: newCoords,
      });

      // Act: Get history from new location
      const history = await testEnv.service.items.history.getItemHistory({
        coords: newCoords,
      });

      // Assert: Version history should be preserved
      expect(history.versions.length).toBeGreaterThan(0);

      // Should still have the original version
      const originalVersion = history.versions.find(v =>
        v.title === "Original Title"
      );
      expect(originalVersion).toBeDefined();
    });
  });
});
