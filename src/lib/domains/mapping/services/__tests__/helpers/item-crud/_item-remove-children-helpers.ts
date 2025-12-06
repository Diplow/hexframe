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
  hexPlans: Array<{ id: number; coordId: string; title: string }>;
  nestedHexPlans: Array<{ id: number; coordId: string; title: string }>;
}

/**
 * Sets up a comprehensive hierarchy with structural, composed, and hexPlan children.
 *
 * Structure created:
 * - Root []
 *   - Structural child [1] (NorthWest)
 *     - HexPlan [1, 0]
 *     - Grandchild [1, 2]
 *       - HexPlan [1, 2, 0]
 *   - Structural child [3] (East)
 *     - HexPlan [3, 0]
 *   - Composed child [-1]
 *     - HexPlan [-1, 0]
 *   - Composed child [-3]
 *   - HexPlan [0]
 */
export async function _setupHierarchyWithAllDirectionTypes(
  testEnv: TestEnvironment,
  params: HierarchySetupParams,
): Promise<HierarchySetupResult> {
  const rootMap = await _setupBasicMap(testEnv.service, params);

  const structuralChildren: HierarchySetupResult["structuralChildren"] = [];
  const composedChildren: HierarchySetupResult["composedChildren"] = [];
  const hexPlans: HierarchySetupResult["hexPlans"] = [];
  const nestedHexPlans: HierarchySetupResult["nestedHexPlans"] = [];

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

  // Add hexPlan for structural child [1, 0]
  const hexPlan1Coords = _createTestCoordinates({
    userId: params.userId,
    groupId: params.groupId,
    path: [Direction.NorthWest, Direction.Center],
  });
  const hexPlan1 = await testEnv.service.items.crud.addItemToMap({
    parentId: structuralChild1Id,
    coords: hexPlan1Coords,
    title: "HexPlan for Child 1",
  });
  nestedHexPlans.push({
    id: Number(hexPlan1.id),
    coordId: CoordSystem.createId(hexPlan1Coords),
    title: hexPlan1.title,
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

  // Add hexPlan for grandchild [1, 2, 0]
  const hexPlan2Coords = _createTestCoordinates({
    userId: params.userId,
    groupId: params.groupId,
    path: [Direction.NorthWest, Direction.NorthEast, Direction.Center],
  });
  const hexPlan2 = await testEnv.service.items.crud.addItemToMap({
    parentId: grandchildId,
    coords: hexPlan2Coords,
    title: "HexPlan for Grandchild",
  });
  nestedHexPlans.push({
    id: Number(hexPlan2.id),
    coordId: CoordSystem.createId(hexPlan2Coords),
    title: hexPlan2.title,
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

  // Add hexPlan for structural child 2 [3, 0]
  const hexPlan3Coords = _createTestCoordinates({
    userId: params.userId,
    groupId: params.groupId,
    path: [Direction.East, Direction.Center],
  });
  const hexPlan3 = await testEnv.service.items.crud.addItemToMap({
    parentId: structuralChild2Id,
    coords: hexPlan3Coords,
    title: "HexPlan for Child 2",
  });
  nestedHexPlans.push({
    id: Number(hexPlan3.id),
    coordId: CoordSystem.createId(hexPlan3Coords),
    title: hexPlan3.title,
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

  // Add hexPlan for composed child [-1, 0]
  const hexPlan4Coords = _createTestCoordinates({
    userId: params.userId,
    groupId: params.groupId,
    path: [Direction.ComposedNorthWest, Direction.Center],
  });
  const hexPlan4 = await testEnv.service.items.crud.addItemToMap({
    parentId: composedChild1Id,
    coords: hexPlan4Coords,
    title: "HexPlan for Composed 1",
  });
  nestedHexPlans.push({
    id: Number(hexPlan4.id),
    coordId: CoordSystem.createId(hexPlan4Coords),
    title: hexPlan4.title,
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

  // Add direct hexPlan [0]
  const directHexPlanCoords = _createTestCoordinates({
    userId: params.userId,
    groupId: params.groupId,
    path: [Direction.Center],
  });
  const directHexPlan = await testEnv.service.items.crud.addItemToMap({
    parentId: rootMap.id,
    coords: directHexPlanCoords,
    title: "Direct HexPlan",
  });
  hexPlans.push({
    id: Number(directHexPlan.id),
    coordId: CoordSystem.createId(directHexPlanCoords),
    title: directHexPlan.title,
  });

  return {
    rootMap,
    structuralChildren,
    composedChildren,
    hexPlans,
    nestedHexPlans,
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

  // Should have deleted structural children and their descendants (including nested hexPlans)
  const expectedDeletedCount =
    setupData.structuralChildren.length +
    setupData.nestedHexPlans.filter((hp) => {
      // Filter to only those under structural children
      const path = CoordSystem.parseId(hp.coordId).path;
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

  // Verify direct hexPlan still exists
  for (const hp of setupData.hexPlans) {
    const item = await testEnv.service.items.crud.getItem({
      coords: CoordSystem.parseId(hp.coordId),
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
    setupData.nestedHexPlans.filter((hp) => {
      // Filter to only those under composed children
      const path = CoordSystem.parseId(hp.coordId).path;
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
 * Validates that removeChildrenByType correctly removes ALL hexPlans in subtree
 */
export async function _validateHexPlanRemoval(
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
    directionType: "hexPlan",
  });

  // Should have deleted ALL hexPlans (direct + nested)
  const expectedDeletedCount =
    setupData.hexPlans.length +
    setupData.nestedHexPlans.length;

  expect(result.deletedCount).toBe(expectedDeletedCount);

  // Verify all hexPlans are gone (direct)
  for (const hp of setupData.hexPlans) {
    await expect(
      testEnv.service.items.crud.getItem({
        coords: CoordSystem.parseId(hp.coordId),
      }),
    ).rejects.toThrow();
  }

  // Verify all nested hexPlans are gone
  for (const hp of setupData.nestedHexPlans) {
    await expect(
      testEnv.service.items.crud.getItem({
        coords: CoordSystem.parseId(hp.coordId),
      }),
    ).rejects.toThrow();
  }

  // Verify structural children still exist (but without their hexPlans)
  for (const child of setupData.structuralChildren) {
    const item = await testEnv.service.items.crud.getItem({
      coords: CoordSystem.parseId(child.coordId),
    });
    expect(item).toBeDefined();
    expect(item.title).toBe(child.title);
  }

  // Verify composed children still exist (but without their hexPlans)
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
  directionType: "structural" | "composed" | "hexPlan",
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
