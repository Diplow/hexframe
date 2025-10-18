import { describe, beforeEach, it } from "vitest";
import { type Coord, Direction } from "~/lib/domains/mapping/utils";
import {
  type TestEnvironment,
  _cleanupDatabase,
  _createTestEnvironment,
  _createTestCoordinates,
  _createUniqueTestParams,
} from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";
import {
  _setupItemForMovement,
  _setupTwoItemsForSwap,
  _setupParentChildHierarchy,
  _setupItemWithComposition,
} from "~/lib/domains/mapping/services/__tests__/helpers/movement/_movement-setup-helpers";
import {
  _validateItemMovementToEmptyCell,
  _validateItemSwapping,
  _validateParentChildMovement,
  _validateUserItemMoveRestriction,
  _validateCrossSpaceMovementError,
  _validateCompositionMovement,
} from "~/lib/domains/mapping/services/__tests__/helpers/movement/_movement-validation-helpers";

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
      const newCoords: Coord = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.SouthEast],
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

    it("should correctly move an item with composed children", async () => {
      const setupParams = _createUniqueTestParams();
      const compositionSetup = await _setupItemWithComposition(
        testEnv,
        setupParams,
      );

      await _validateCompositionMovement(testEnv, compositionSetup);
    });
  });
});
