import { describe, beforeEach, it, expect } from "vitest";
import { HexDirection, CoordSystem } from "../../utils/hex-coordinates";
import type { HexCoord } from "../../utils/hex-coordinates";
import {
  type TestEnvironment,
  _cleanupDatabase,
  _createTestEnvironment,
  _setupBasicMap,
  _createTestCoordinates,
  _createUniqueTestParams,
} from "./helpers/_test-utilities";
import {
  _setupItemForMovement,
  _setupTwoItemsForSwap,
  _setupParentChildHierarchy,
} from "./helpers/movement/_movement-setup-helpers";
import {
  _validateItemMovementToEmptyCell,
  _validateItemSwapping,
  _validateParentChildMovement,
  _validateUserItemMoveRestriction,
  _validateCrossSpaceMovementError,
} from "./helpers/movement/_movement-validation-helpers";

describe("MappingService - Item Movement [Integration - DB]", () => {
  let testEnv: TestEnvironment;

  beforeEach(async () => {
    await _cleanupDatabase();
    testEnv = _createTestEnvironment();
  });

  describe("moveMapItem", () => {
    it("should move an item to an empty cell", async () => {
      const setupParams = _createUniqueTestParams();
      const movementSetup = await _setupItemForMovement(testEnv, setupParams);
      const newCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [HexDirection.SouthEast],
      });

      await _validateItemMovementToEmptyCell(testEnv, movementSetup, newCoords);
    });

    it("should swap two items when moving to occupied cell", async () => {
      const setupParams = _createUniqueTestParams();
      const swapSetup = await _setupTwoItemsForSwap(testEnv, setupParams);

      await _validateItemSwapping(testEnv, swapSetup);
    });

    it("should correctly move a parent item and its children", async () => {
      const setupParams = _createUniqueTestParams();
      const hierarchySetup = await _setupParentChildHierarchy(
        testEnv,
        setupParams,
      );

      await _validateParentChildMovement(testEnv, hierarchySetup);
    });

    it("should throw error for moving USER item to child position", async () => {
      await _validateUserItemMoveRestriction(testEnv);
    });

    it("should throw error for cross-space movement", async () => {
      const setupParams = _createUniqueTestParams();
      const movementSetup = await _setupItemForMovement(testEnv, setupParams);

      await _validateCrossSpaceMovementError(testEnv, movementSetup);
    });
  });
});
