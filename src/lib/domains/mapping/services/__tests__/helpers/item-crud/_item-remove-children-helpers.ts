import { expect } from "vitest";
import type { TestEnvironment } from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";
import {
  _createTestCoordinates,
  _setupBasicMap,
} from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";
import { Direction, CoordSystem } from "~/lib/domains/mapping/utils";

interface HierarchySetupParams {
  userId: string;
  groupId: number;
}

interface HierarchySetupResult {
  rootMap: Awaited<ReturnType<typeof _setupBasicMap>>;
  structuralChildren: Array<{ id: number; coordId: string; title: string }>;
  composedChildren: Array<{ id: number; coordId: string; title: string }>;
  executionHistories: Array<{ id: number; coordId: string; title: string }>;
  nestedExecutionHistories: Array<{ id: number; coordId: string; title: string }>;
}

/**
 * Sets up a comprehensive hierarchy with structural, composed, and execution history children.
 *
 * Structure created:
 * - Root []
 *   - Structural child [1] (NorthWest)
 *     - Execution history [1, 0]
 *     - Grandchild [1, 2]
 *       - Execution history [1, 2, 0]
 *   - Structural child [3] (East)
 *     - Execution history [3, 0]
 *   - Composed child [-1]
 *     - Execution history [-1, 0]
 *   - Composed child [-3]
 *   - Execution history [0]
 */
export async function _setupHierarchyWithAllDirectionTypes(
  testEnv: TestEnvironment,
  params: HierarchySetupParams,
): Promise<HierarchySetupResult> {
  const rootMap = await _setupBasicMap(testEnv.service, params);

  const structuralChildren: HierarchySetupResult["structuralChildren"] = [];
  const composedChildren: HierarchySetupResult["composedChildren"] = [];
  const executionHistories: HierarchySetupResult["executionHistories"] = [];
  const nestedExecutionHistories: HierarchySetupResult["nestedExecutionHistories"] = [];

  // Add structural child [1] (NorthWest)
  const structuralChild1Coords = _createTestCoordinates({
    userId: params.userId,
    groupId: params.groupId,
    path: [Direction.NorthWest],
  });
  const structuralChild1 = await testEnv.service.items.crud.addItemToMap({
    parentId: rootMap.id,
    coords: structuralChild1Coords,
    title: "Structural Child 1",
  });
  const structuralChild1Id = Number(structuralChild1.id);
  structuralChildren.push({
    id: structuralChild1Id,
    coordId: CoordSystem.createId(structuralChild1Coords),
    title: structuralChild1.title,
  });

  // Add execution history for structural child [1, 0]
  const execHistory1Coords = _createTestCoordinates({
    userId: params.userId,
    groupId: params.groupId,
    path: [Direction.NorthWest, Direction.Center],
  });
  const execHistory1 = await testEnv.service.items.crud.addItemToMap({
    parentId: structuralChild1Id,
    coords: execHistory1Coords,
    title: "Exec History for Child 1",
  });
  nestedExecutionHistories.push({
    id: Number(execHistory1.id),
    coordId: CoordSystem.createId(execHistory1Coords),
    title: execHistory1.title,
  });

  // Add grandchild [1, 2] (NorthWest -> NorthEast)
  const grandchildCoords = _createTestCoordinates({
    userId: params.userId,
    groupId: params.groupId,
    path: [Direction.NorthWest, Direction.NorthEast],
  });
  const grandchild = await testEnv.service.items.crud.addItemToMap({
    parentId: structuralChild1Id,
    coords: grandchildCoords,
    title: "Grandchild",
  });
  const grandchildId = Number(grandchild.id);
  structuralChildren.push({
    id: grandchildId,
    coordId: CoordSystem.createId(grandchildCoords),
    title: grandchild.title,
  });

  // Add execution history for grandchild [1, 2, 0]
  const execHistory2Coords = _createTestCoordinates({
    userId: params.userId,
    groupId: params.groupId,
    path: [Direction.NorthWest, Direction.NorthEast, Direction.Center],
  });
  const execHistory2 = await testEnv.service.items.crud.addItemToMap({
    parentId: grandchildId,
    coords: execHistory2Coords,
    title: "Exec History for Grandchild",
  });
  nestedExecutionHistories.push({
    id: Number(execHistory2.id),
    coordId: CoordSystem.createId(execHistory2Coords),
    title: execHistory2.title,
  });

  // Add structural child [3] (East)
  const structuralChild2Coords = _createTestCoordinates({
    userId: params.userId,
    groupId: params.groupId,
    path: [Direction.East],
  });
  const structuralChild2 = await testEnv.service.items.crud.addItemToMap({
    parentId: rootMap.id,
    coords: structuralChild2Coords,
    title: "Structural Child 2",
  });
  const structuralChild2Id = Number(structuralChild2.id);
  structuralChildren.push({
    id: structuralChild2Id,
    coordId: CoordSystem.createId(structuralChild2Coords),
    title: structuralChild2.title,
  });

  // Add execution history for structural child 2 [3, 0]
  const execHistory3Coords = _createTestCoordinates({
    userId: params.userId,
    groupId: params.groupId,
    path: [Direction.East, Direction.Center],
  });
  const execHistory3 = await testEnv.service.items.crud.addItemToMap({
    parentId: structuralChild2Id,
    coords: execHistory3Coords,
    title: "Exec History for Child 2",
  });
  nestedExecutionHistories.push({
    id: Number(execHistory3.id),
    coordId: CoordSystem.createId(execHistory3Coords),
    title: execHistory3.title,
  });

  // Add composed child [-1] (ComposedNW)
  const composedChild1Coords = _createTestCoordinates({
    userId: params.userId,
    groupId: params.groupId,
    path: [Direction.ComposedNorthWest],
  });
  const composedChild1 = await testEnv.service.items.crud.addItemToMap({
    parentId: rootMap.id,
    coords: composedChild1Coords,
    title: "Composed Child 1",
  });
  const composedChild1Id = Number(composedChild1.id);
  composedChildren.push({
    id: composedChild1Id,
    coordId: CoordSystem.createId(composedChild1Coords),
    title: composedChild1.title,
  });

  // Add execution history for composed child [-1, 0]
  const execHistory4Coords = _createTestCoordinates({
    userId: params.userId,
    groupId: params.groupId,
    path: [Direction.ComposedNorthWest, Direction.Center],
  });
  const execHistory4 = await testEnv.service.items.crud.addItemToMap({
    parentId: composedChild1Id,
    coords: execHistory4Coords,
    title: "Exec History for Composed 1",
  });
  nestedExecutionHistories.push({
    id: Number(execHistory4.id),
    coordId: CoordSystem.createId(execHistory4Coords),
    title: execHistory4.title,
  });

  // Add composed child [-3] (ComposedE)
  const composedChild2Coords = _createTestCoordinates({
    userId: params.userId,
    groupId: params.groupId,
    path: [Direction.ComposedEast],
  });
  const composedChild2 = await testEnv.service.items.crud.addItemToMap({
    parentId: rootMap.id,
    coords: composedChild2Coords,
    title: "Composed Child 2",
  });
  composedChildren.push({
    id: Number(composedChild2.id),
    coordId: CoordSystem.createId(composedChild2Coords),
    title: composedChild2.title,
  });

  // Add direct execution history [0]
  const directExecHistoryCoords = _createTestCoordinates({
    userId: params.userId,
    groupId: params.groupId,
    path: [Direction.Center],
  });
  const directExecHistory = await testEnv.service.items.crud.addItemToMap({
    parentId: rootMap.id,
    coords: directExecHistoryCoords,
    title: "Direct Execution History",
  });
  executionHistories.push({
    id: Number(directExecHistory.id),
    coordId: CoordSystem.createId(directExecHistoryCoords),
    title: directExecHistory.title,
  });

  return {
    rootMap,
    structuralChildren,
    composedChildren,
    executionHistories,
    nestedExecutionHistories,
  };
}

/**
 * Validates that removeChildrenByType correctly removes structural children
 */
export async function _validateStructuralChildrenRemoval(
  testEnv: TestEnvironment,
  setupData: HierarchySetupResult,
  rootCoords: { userId: string; groupId: number },
): Promise<void> {
  const coords = _createTestCoordinates({
    userId: rootCoords.userId,
    groupId: rootCoords.groupId,
    path: [],
  });

  const result = await testEnv.service.items.crud.removeChildrenByType({
    coords,
    directionType: "structural",
  });

  // Should have deleted structural children and their descendants (including nested exec histories)
  const expectedDeletedCount =
    setupData.structuralChildren.length +
    setupData.nestedExecutionHistories.filter((eh) => {
      // Filter to only those under structural children
      const path = CoordSystem.parseId(eh.coordId).path;
      return path.length > 0 && path[0]! > Direction.Center;
    }).length;

  expect(result.deletedCount).toBe(expectedDeletedCount);

  // Verify structural children are gone
  for (const child of setupData.structuralChildren) {
    await expect(
      testEnv.service.items.crud.getItem({
        coords: CoordSystem.parseId(child.coordId),
      }),
    ).rejects.toThrow();
  }

  // Verify composed children still exist
  for (const child of setupData.composedChildren) {
    const item = await testEnv.service.items.crud.getItem({
      coords: CoordSystem.parseId(child.coordId),
    });
    expect(item).toBeDefined();
    expect(item.title).toBe(child.title);
  }

  // Verify direct execution history still exists
  for (const eh of setupData.executionHistories) {
    const item = await testEnv.service.items.crud.getItem({
      coords: CoordSystem.parseId(eh.coordId),
    });
    expect(item).toBeDefined();
  }
}

/**
 * Validates that removeChildrenByType correctly removes composed children
 */
export async function _validateComposedChildrenRemoval(
  testEnv: TestEnvironment,
  setupData: HierarchySetupResult,
  rootCoords: { userId: string; groupId: number },
): Promise<void> {
  const coords = _createTestCoordinates({
    userId: rootCoords.userId,
    groupId: rootCoords.groupId,
    path: [],
  });

  const result = await testEnv.service.items.crud.removeChildrenByType({
    coords,
    directionType: "composed",
  });

  // Should have deleted composed children and their descendants
  const expectedDeletedCount =
    setupData.composedChildren.length +
    setupData.nestedExecutionHistories.filter((eh) => {
      // Filter to only those under composed children
      const path = CoordSystem.parseId(eh.coordId).path;
      return path.length > 0 && path[0]! < Direction.Center;
    }).length;

  expect(result.deletedCount).toBe(expectedDeletedCount);

  // Verify composed children are gone
  for (const child of setupData.composedChildren) {
    await expect(
      testEnv.service.items.crud.getItem({
        coords: CoordSystem.parseId(child.coordId),
      }),
    ).rejects.toThrow();
  }

  // Verify structural children still exist
  for (const child of setupData.structuralChildren) {
    const item = await testEnv.service.items.crud.getItem({
      coords: CoordSystem.parseId(child.coordId),
    });
    expect(item).toBeDefined();
    expect(item.title).toBe(child.title);
  }
}

/**
 * Validates that removeChildrenByType correctly removes ALL execution histories in subtree
 */
export async function _validateExecutionHistoryRemoval(
  testEnv: TestEnvironment,
  setupData: HierarchySetupResult,
  rootCoords: { userId: string; groupId: number },
): Promise<void> {
  const coords = _createTestCoordinates({
    userId: rootCoords.userId,
    groupId: rootCoords.groupId,
    path: [],
  });

  const result = await testEnv.service.items.crud.removeChildrenByType({
    coords,
    directionType: "executionHistory",
  });

  // Should have deleted ALL execution histories (direct + nested)
  const expectedDeletedCount =
    setupData.executionHistories.length +
    setupData.nestedExecutionHistories.length;

  expect(result.deletedCount).toBe(expectedDeletedCount);

  // Verify all execution histories are gone (direct)
  for (const eh of setupData.executionHistories) {
    await expect(
      testEnv.service.items.crud.getItem({
        coords: CoordSystem.parseId(eh.coordId),
      }),
    ).rejects.toThrow();
  }

  // Verify all nested execution histories are gone
  for (const eh of setupData.nestedExecutionHistories) {
    await expect(
      testEnv.service.items.crud.getItem({
        coords: CoordSystem.parseId(eh.coordId),
      }),
    ).rejects.toThrow();
  }

  // Verify structural children still exist (but without their exec histories)
  for (const child of setupData.structuralChildren) {
    const item = await testEnv.service.items.crud.getItem({
      coords: CoordSystem.parseId(child.coordId),
    });
    expect(item).toBeDefined();
    expect(item.title).toBe(child.title);
  }

  // Verify composed children still exist (but without their exec histories)
  for (const child of setupData.composedChildren) {
    const item = await testEnv.service.items.crud.getItem({
      coords: CoordSystem.parseId(child.coordId),
    });
    expect(item).toBeDefined();
    expect(item.title).toBe(child.title);
  }
}

/**
 * Validates that removeChildrenByType returns 0 when no matching children exist
 */
export async function _validateNoMatchingChildren(
  testEnv: TestEnvironment,
  params: HierarchySetupParams,
  directionType: "structural" | "composed" | "executionHistory",
): Promise<void> {
  const rootMap = await _setupBasicMap(testEnv.service, params);

  const coords = _createTestCoordinates({
    userId: params.userId,
    groupId: params.groupId,
    path: [],
  });

  const result = await testEnv.service.items.crud.removeChildrenByType({
    coords,
    directionType,
  });

  expect(result.deletedCount).toBe(0);

  // Root should still exist
  const root = await testEnv.service.items.crud.getItem({ coords });
  expect(root).toBeDefined();
  // Note: root.id is string from contract, rootMap.id is number from MapContract
  expect(root.id).toBe(String(rootMap.id));
}
