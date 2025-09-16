import { describe, beforeEach, it } from "vitest";
import {
  type TestEnvironment,
  _cleanupDatabase,
  _createTestEnvironment,
  _setupBasicMap,
  _createTestCoordinates,
  _createUniqueTestParams,
} from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";
import {
  _addAndValidateChildItem,
  _validateMapItemHierarchy,
  _validateMismatchedCoordinatesError,
  _validateNonChildCoordinatesError,
  _validateNonExistentParentError,
} from "~/lib/domains/mapping/services/__tests__/helpers/item-crud/_item-add-helpers";
import {
  _setupItemForRetrieval,
  _validateItemRetrieval,
  _validateItemNotFoundError,
} from "~/lib/domains/mapping/services/__tests__/helpers/item-crud/_item-get-helpers";
import {
  _setupItemForUpdate,
  _updateAndValidateItem,
  _validateUpdateNonExistentItemError,
  _partialUpdateAndValidate,
} from "~/lib/domains/mapping/services/__tests__/helpers/item-crud/_item-update-helpers";
import {
  _setupItemHierarchyForRemoval,
  _validateItemRemovalAndHierarchy,
  _validateRootItemRemoval,
  _validateRemoveNonExistentItemError,
} from "~/lib/domains/mapping/services/__tests__/helpers/item-crud/_item-remove-helpers";
import { Direction } from "~/lib/domains/mapping/utils";

describe("MappingService - Item CRUD [Integration - DB]", () => {
  let testEnv: TestEnvironment;

  beforeEach(async () => {
    await _cleanupDatabase();
    testEnv = _createTestEnvironment();
  });

  describe("addItemToMap", () => {
    it("should add a child BASE item to a root USER item", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      const childCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.East],
      });

      const addItemArgs = {
        parentId: rootMap.id,
        coords: childCoords,
        title: "Child Item 1",
        descr: "Child Description",
      };

      await _addAndValidateChildItem(
        testEnv,
        { rootMapItem: { id: rootMap.id } },
        addItemArgs,
      );
      await _validateMapItemHierarchy(testEnv, setupParams, addItemArgs);
    });

    it("should throw error for mismatched userId/groupId in coords", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      const mismatchedCoords = _createTestCoordinates({
        userId: setupParams.userId + 999999,
        groupId: setupParams.groupId,
        path: [Direction.East],
      });

      await _validateMismatchedCoordinatesError(testEnv, {
        rootMapId: rootMap.id,
        mismatchedCoords,
      });
    });

    it("should throw error for non-child coordinates", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      const nonChildCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.West, Direction.West],
      });

      await _validateNonChildCoordinatesError(testEnv, {
        rootMapId: rootMap.id,
        nonChildCoords,
      });
    });

    it("should throw error for non-existent parentId", async () => {
      const testParams = _createUniqueTestParams();

      const childCoords = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.East],
      });

      await _validateNonExistentParentError(testEnv, { childCoords });
    });
  });

  describe("getItem", () => {
    it("should get a map item by coordinates", async () => {
      const setupParams = _createUniqueTestParams();

      const { itemCoords } = await _setupItemForRetrieval(testEnv, setupParams);

      await _validateItemRetrieval(testEnv, itemCoords, {
        title: "Test Retrievable Item",
        descr: "Test Description",
        url: "https://example.com",
      });
    });

    it("should throw error when item not found", async () => {
      const setupParams = _createUniqueTestParams();
      await _setupBasicMap(testEnv.service, setupParams);

      const nonExistentCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.SouthWest, Direction.West],
      });

      await _validateItemNotFoundError(testEnv, nonExistentCoords);
    });
  });

  describe("updateItem", () => {
    it("should update an item's attributes (title, descr, url)", async () => {
      const setupParams = _createUniqueTestParams();
      const updateData = {
        title: "Updated Item Title",
        descr: "Updated Item Descr",
        url: "http://updated.url",
      };

      const { itemCoords } = await _setupItemForUpdate(testEnv, setupParams);
      await _updateAndValidateItem(testEnv, itemCoords, updateData);
    });

    it("should throw error for non-existent coords", async () => {
      const testParams = _createUniqueTestParams();
      await _validateUpdateNonExistentItemError(testEnv, testParams);
    });

    it("should partially update attributes (e.g., only title)", async () => {
      const setupParams = _createUniqueTestParams();

      const { itemCoords } = await _setupItemForUpdate(testEnv, setupParams);
      await _partialUpdateAndValidate(testEnv, itemCoords, {
        title: "New Title Only",
      });
    });
  });

  describe("removeItem", () => {
    it("should remove an item and its descendants", async () => {
      const setupParams = _createUniqueTestParams();
      const setupData = await _setupItemHierarchyForRemoval(
        testEnv,
        setupParams,
      );

      await _validateItemRemovalAndHierarchy(testEnv, setupData);
    });

    it("should remove a root item (USER type)", async () => {
      const setupParams = _createUniqueTestParams();
      await _validateRootItemRemoval(testEnv, setupParams);
    });

    it("should throw error for non-existent coords", async () => {
      const testParams = _createUniqueTestParams();
      await _validateRemoveNonExistentItemError(testEnv, testParams);
    });
  });
});
