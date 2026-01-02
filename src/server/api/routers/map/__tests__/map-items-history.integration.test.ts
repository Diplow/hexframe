import { describe, beforeEach, it, expect } from "vitest";
import { type Coord, Direction, CoordSystem } from "~/lib/domains/mapping/utils";
import {
  type TestEnvironment,
  _cleanupDatabase,
  _createTestEnvironment,
  _setupBasicMap,
  _createTestCoordinates,
  _createUniqueTestParams,
  createTestItem,
} from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";

describe("tRPC Map Items Router - History Queries [Integration - DB]", () => {
  let testEnv: TestEnvironment;

  beforeEach(async () => {
    await _cleanupDatabase();
    testEnv = _createTestEnvironment();
  });

  describe("getItemHistory", () => {
    it("should return version history for tile with multiple versions", async () => {
      const setup = await _setupTileWithVersionHistory();

      // Query via domain service (simulating tRPC call)
      const history = await testEnv.service.items.history.getItemHistory({
        coords: setup.tileCoords,
        limit: 50,
        offset: 0,
      });

      // Should return current version + historical versions
      expect(history.currentVersion).toBeDefined();
      expect(history.currentVersion.title).toBe("Version 3 Title");
      expect(history.versions.length).toBe(3); // All 3 versions
      expect(history.hasMore).toBe(false);
      expect(history.totalCount).toBe(3);

      // Verify versions are in descending order (newest first)
      expect(history.versions[0]!.versionNumber).toBe(3);
      expect(history.versions[1]!.versionNumber).toBe(2);
      expect(history.versions[2]!.versionNumber).toBe(1);
    });

    it("should return only current version for tile with no updates", async () => {
      const setup = await _setupTileWithoutUpdates();

      const history = await testEnv.service.items.history.getItemHistory({
        coords: setup.tileCoords,
      });

      // Should have current version and 1 historical version (initial creation)
      expect(history.currentVersion).toBeDefined();
      expect(history.currentVersion.title).toBe("Initial Title");
      expect(history.versions.length).toBe(1);
      expect(history.versions[0]!.versionNumber).toBe(1);
      expect(history.hasMore).toBe(false);
    });

    it("should respect limit parameter for pagination", async () => {
      const setup = await _setupTileWithManyVersions(10);

      const history = await testEnv.service.items.history.getItemHistory({
        coords: setup.tileCoords,
        limit: 5,
        offset: 0,
      });

      expect(history.versions.length).toBe(5);
      expect(history.hasMore).toBe(true);
      expect(history.versions[0]!.versionNumber).toBe(10); // Newest first
      expect(history.versions[4]!.versionNumber).toBe(6);
    });

    it("should respect offset parameter for pagination", async () => {
      const setup = await _setupTileWithManyVersions(10);

      const history = await testEnv.service.items.history.getItemHistory({
        coords: setup.tileCoords,
        limit: 5,
        offset: 5,
      });

      expect(history.versions.length).toBeLessThanOrEqual(5);
      expect(history.versions[0]!.versionNumber).toBeLessThanOrEqual(5);
      expect(history.versions[history.versions.length - 1]!.versionNumber).toBe(1); // Oldest
    });

    it("should throw error for non-existent tile coordinates", async () => {
      const testParams = _createUniqueTestParams();
      const nonExistentCoords: Coord = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthEast, Direction.East, Direction.West],
      });

      await expect(
        testEnv.service.items.history.getItemHistory({
          coords: nonExistentCoords,
        })
      ).rejects.toThrow();
    });

    it("should handle root tile version history", async () => {
      const testParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, testParams);
      const rootItem = rootMap.items[0];
      if (!rootItem) throw new Error("Root item not found");

      const rootCoords = CoordSystem.parseId(rootItem.coords);

      // Update root tile to create versions
      await testEnv.service.items.crud.updateItem({
        coords: rootCoords,
        title: "Updated Root Title",
      });

      const history = await testEnv.service.items.history.getItemHistory({
        coords: rootCoords,
      });

      expect(history.currentVersion.title).toBe("Updated Root Title");
      expect(history.versions.length).toBeGreaterThanOrEqual(2);
    });

    it("should include version metadata (createdAt, updatedBy)", async () => {
      const setup = await _setupTileWithVersionHistory();

      const history = await testEnv.service.items.history.getItemHistory({
        coords: setup.tileCoords,
      });

      const firstVersion = history.versions[0];
      expect(firstVersion).toBeDefined();
      expect(firstVersion!.createdAt).toBeDefined();
      expect(firstVersion!.updatedBy).toBeDefined();
      expect(firstVersion!.versionNumber).toBeDefined();
    });

    it("should preserve content across version history", async () => {
      const setup = await _setupTileWithContentChanges();

      const history = await testEnv.service.items.history.getItemHistory({
        coords: setup.tileCoords,
      });

      // Current version should have latest content
      expect(history.currentVersion.content).toBe("Third content update");

      // Should have all versions
      expect(history.versions.length).toBe(3);

      // Versions should be ordered newest to oldest
      expect(history.versions[0]!.versionNumber).toBe(3);
      expect(history.versions[2]!.versionNumber).toBe(1);
    });
  });

  describe("getItemVersion", () => {
    it("should return specific historical version by number", async () => {
      const setup = await _setupTileWithVersionHistory();

      const version2 = await testEnv.service.items.history.getItemVersion({
        coords: setup.tileCoords,
        versionNumber: 2,
      });

      expect(version2.versionNumber).toBe(2);
      expect(version2.title).toBeDefined();
    });

    it("should return first version when requested", async () => {
      const setup = await _setupTileWithVersionHistory();

      const version1 = await testEnv.service.items.history.getItemVersion({
        coords: setup.tileCoords,
        versionNumber: 1,
      });

      expect(version1.versionNumber).toBe(1);
      expect(version1.title).toBe("Version 1 Title");
    });

    it("should return latest version when requested", async () => {
      const setup = await _setupTileWithVersionHistory();

      const version3 = await testEnv.service.items.history.getItemVersion({
        coords: setup.tileCoords,
        versionNumber: 3,
      });

      expect(version3.versionNumber).toBe(3);
      expect(version3.title).toBeDefined();
    });

    it("should throw error for non-existent version number", async () => {
      const setup = await _setupTileWithVersionHistory();

      await expect(
        testEnv.service.items.history.getItemVersion({
          coords: setup.tileCoords,
          versionNumber: 999,
        })
      ).rejects.toThrow();
    });

    it("should throw error for invalid version number (zero)", async () => {
      const setup = await _setupTileWithVersionHistory();

      await expect(
        testEnv.service.items.history.getItemVersion({
          coords: setup.tileCoords,
          versionNumber: 0,
        })
      ).rejects.toThrow();
    });

    it("should throw error for non-existent tile coordinates", async () => {
      const testParams = _createUniqueTestParams();
      const nonExistentCoords: Coord = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.SouthWest, Direction.NorthWest],
      });

      await expect(
        testEnv.service.items.history.getItemVersion({
          coords: nonExistentCoords,
          versionNumber: 1,
        })
      ).rejects.toThrow();
    });

    it("should include all version fields (title, content, preview, link)", async () => {
      const setup = await _setupTileWithAllFieldsVersioned();

      const version1 = await testEnv.service.items.history.getItemVersion({
        coords: setup.tileCoords,
        versionNumber: 1,
      });

      expect(version1.title).toBe("Initial Title");
      expect(version1.content).toBe("Initial Content");
      expect(version1.preview).toBe("Initial Preview");
      expect(version1.link).toBe("https://initial.com");
    });

    it("should preserve partial updates in versions", async () => {
      const setup = await _setupTileWithPartialUpdates();

      // Version 1: All fields set
      const version1 = await testEnv.service.items.history.getItemVersion({
        coords: setup.tileCoords,
        versionNumber: 1,
      });
      expect(version1.title).toBeDefined();
      expect(version1.content).toBeDefined();

      // Version 2: Only title updated
      const version2 = await testEnv.service.items.history.getItemVersion({
        coords: setup.tileCoords,
        versionNumber: 2,
      });
      expect(version2.title).toBeDefined();
      expect(version2.content).toBeDefined();

      // Version 3: Only content updated
      const version3 = await testEnv.service.items.history.getItemVersion({
        coords: setup.tileCoords,
        versionNumber: 3,
      });
      expect(version3.title).toBeDefined();
      expect(version3.content).toBeDefined();

      // Verify we have all 3 versions
      expect(version1.versionNumber).toBe(1);
      expect(version2.versionNumber).toBe(2);
      expect(version3.versionNumber).toBe(3);
    });
  });

  // Helper functions
  async function _setupTileWithVersionHistory() {
    const testParams = _createUniqueTestParams();
    const { userId, groupId } = testParams;
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    const tileCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast],
    });

    // Create initial tile (version 1)
    const item = await createTestItem(testEnv, {
      parentId: rootMap.id,
      coords: tileCoords,
      title: "Version 1 Title",
    });

    // Update to create version 2
    await testEnv.service.items.crud.updateItem({
      coords: tileCoords,
      title: "Version 2 Title",
    });

    // Update to create version 3
    await testEnv.service.items.crud.updateItem({
      coords: tileCoords,
      title: "Version 3 Title",
    });

    return { tileCoords, itemId: parseInt(item.id) };
  }

  async function _setupTileWithoutUpdates() {
    const testParams = _createUniqueTestParams();
    const { userId, groupId } = testParams;
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    const tileCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.East],
    });

    await createTestItem(testEnv, {
      parentId: rootMap.id,
      coords: tileCoords,
      title: "Initial Title",
    });

    return { tileCoords };
  }

  async function _setupTileWithManyVersions(versionCount: number) {
    const testParams = _createUniqueTestParams();
    const { userId, groupId } = testParams;
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    const tileCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.West],
    });

    // Create initial tile
    await createTestItem(testEnv, {
      parentId: rootMap.id,
      coords: tileCoords,
      title: "Version 1",
    });

    // Create additional versions
    for (let i = 2; i <= versionCount; i++) {
      await testEnv.service.items.crud.updateItem({
        coords: tileCoords,
        title: `Version ${i}`,
      });
    }

    return { tileCoords };
  }

  async function _setupTileWithContentChanges() {
    const testParams = _createUniqueTestParams();
    const { userId, groupId } = testParams;
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    const tileCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.SouthEast],
    });

    await createTestItem(testEnv, {
      parentId: rootMap.id,
      coords: tileCoords,
      title: "Title",
      content: "Initial content",
    });

    await testEnv.service.items.crud.updateItem({
      coords: tileCoords,
      content: "Second content update",
    });

    await testEnv.service.items.crud.updateItem({
      coords: tileCoords,
      content: "Third content update",
    });

    return { tileCoords };
  }

  async function _setupTileWithAllFieldsVersioned() {
    const testParams = _createUniqueTestParams();
    const { userId, groupId } = testParams;
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    const tileCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.SouthWest],
    });

    await createTestItem(testEnv, {
      parentId: rootMap.id,
      coords: tileCoords,
      title: "Initial Title",
      content: "Initial Content",
      preview: "Initial Preview",
      link: "https://initial.com",
    });

    return { tileCoords };
  }

  async function _setupTileWithPartialUpdates() {
    const testParams = _createUniqueTestParams();
    const { userId, groupId } = testParams;
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    const tileCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthWest],
    });

    // Create with all fields
    await createTestItem(testEnv, {
      parentId: rootMap.id,
      coords: tileCoords,
      title: "Original Title",
      content: "Original Content",
    });

    // Update only title
    await testEnv.service.items.crud.updateItem({
      coords: tileCoords,
      title: "Updated Title",
    });

    // Update only content
    await testEnv.service.items.crud.updateItem({
      coords: tileCoords,
      content: "Updated Content",
    });

    return { tileCoords };
  }
});
