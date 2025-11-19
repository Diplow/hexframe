import { describe, beforeEach, it, expect } from "vitest";
import {
  type TestEnvironment,
  _cleanupDatabase,
  _createTestEnvironment,
  _setupBasicMap,
  _createUniqueTestParams,
} from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";
import {
  _createAndValidateMap,
  _validateMapInRepository,
  _validateRetrievedMapData,
  _setupMultipleUserMaps,
  _validateUserMapsRetrieval,
  _updateAndValidateMapInfo,
  _validateUpdatedMapInRepository,
  _validateMapRemoval,
} from "~/lib/domains/mapping/services/__tests__/helpers/_map-lifecycle-helpers";

describe("MappingService - Map Lifecycle [Integration - DB]", () => {
  let testEnv: TestEnvironment;

  beforeEach(async () => {
    await _cleanupDatabase();
    testEnv = _createTestEnvironment();
  });

  describe("createMap", () => {
    it("should create a root USER MapItem (a new 'map')", async () => {
      const mapCreationParams = _createUniqueTestParams();
      const expectedMapData = {
        title: "Test Root MapItem",
        content: "Test Description",
      };

      await _createAndValidateMap(testEnv, mapCreationParams, expectedMapData);
      await _validateMapInRepository(
        testEnv,
        mapCreationParams,
        expectedMapData,
      );
    });
  });

  describe("getMapData", () => {
    it("should get a root MapItem's data by userId and groupId", async () => {
      const mapParams = _createUniqueTestParams();
      const createdMap = await _setupBasicMap(testEnv.service, mapParams);

      const retrievedMapData = await testEnv.service.maps.getMapData(mapParams);

      _validateRetrievedMapData(retrievedMapData, createdMap, mapParams);
    });

    it("should throw error for non-existent userId/groupId", async () => {
      const nonExistentParams = _createUniqueTestParams("user-test-999999");
      await expect(
        testEnv.service.maps.getMapData(nonExistentParams),
      ).rejects.toThrow();
    });
  });

  describe("getManyUserMaps", () => {
    it("should get multiple maps for a user with pagination", async () => {
      const testParams = _createUniqueTestParams();
      const { map1, map2 } = await _setupMultipleUserMaps(
        testEnv,
        testParams.userId,
      );

      const retrievedMaps = await testEnv.service.maps.getManyUserMaps(
        testParams.userId,
        2,
        0,
      );

      _validateUserMapsRetrieval(retrievedMaps, [map1, map2]);
    });

    it("should use default pagination values", async () => {
      const testParams = _createUniqueTestParams();
      await _setupMultipleUserMaps(testEnv, testParams.userId);

      const maps = await testEnv.service.maps.getManyUserMaps(
        testParams.userId,
      );

      expect(maps.length).toBeGreaterThanOrEqual(2);
    });

    it("should return empty array for user with no maps", async () => {
      const nonExistentParams = _createUniqueTestParams("user-test-999999");
      const maps = await testEnv.service.maps.getManyUserMaps(
        nonExistentParams.userId,
      );
      expect(maps).toHaveLength(0);
    });
  });

  describe("updateMapInfo", () => {
    it("should update a root MapItem's title and description", async () => {
      const mapParams = _createUniqueTestParams();
      const createdMap = await _setupBasicMap(testEnv.service, mapParams);
      const updateData = {
        title: "Updated Title",
        content: "Updated Description",
      };

      await _updateAndValidateMapInfo(
        testEnv,
        mapParams,
        updateData,
        createdMap.id,
      );
      await _validateUpdatedMapInRepository(testEnv, mapParams, updateData);
    });

    it("should throw error for non-existent map", async () => {
      const nonExistentParams = _createUniqueTestParams("user-test-999999");
      await expect(
        testEnv.service.maps.updateMapInfo({
          ...nonExistentParams,
          title: "Nope",
        }),
      ).rejects.toThrow();
    });
  });

  describe("removeMap", () => {
    it("should remove a root MapItem and its descendants", async () => {
      const mapParams = _createUniqueTestParams();
      await _setupBasicMap(testEnv.service, mapParams);

      await testEnv.service.maps.removeMap(mapParams);

      await _validateMapRemoval(testEnv, mapParams);
    });

    it("should handle removing non-existent map gracefully", async () => {
      const nonExistentParams = _createUniqueTestParams("user-test-999999");
      await expect(
        testEnv.service.maps.removeMap(nonExistentParams),
      ).resolves.not.toThrow();
    });
  });
});
