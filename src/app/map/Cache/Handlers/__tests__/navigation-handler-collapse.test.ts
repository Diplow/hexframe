import { describe, it, expect, vi, beforeEach, type MockedFunction } from "vitest";
import { createNavigationHandler } from "~/app/map/Cache/Handlers/NavigationHandler/navigation-handler";
import type { CacheState, CacheAction } from "~/app/map/Cache/State/types";
import { ACTION_TYPES } from "~/app/map/Cache/State/types";
import type { DataOperations } from "~/app/map/Cache/types/handlers";
import type { TileData } from "~/app/map/types/tile-data";
import { initialCacheState } from "~/app/map/Cache/State/reducer";
import { CoordSystem } from "~/lib/domains/mapping/utils";

describe("NavigationHandler - Collapse distant tiles", () => {
  let dispatch: MockedFunction<React.Dispatch<CacheAction>>;
  let getState: MockedFunction<() => CacheState>;
  let dataHandler: DataOperations;
  let navigationHandler: ReturnType<typeof createNavigationHandler>;
  
  // Helper to create test data with coordId->dbId mapping
  const createTestTile = (coordId: string, dbId: string): TileData => ({
    metadata: {
      coordId,
      dbId,
      ownerId: "user1",
      coordinates: {
        userId: 1,
        groupId: 0,
        path: coordId.split(":")[1]?.split(",").map(Number) ?? [],
      },
      depth: coordId.split(":")[1]?.split(",").length ?? 0,
      parentId: CoordSystem.getParentCoordFromId(coordId),
    },
    data: {
      title: "Test Tile",
      content: "Test Description",
        preview: undefined,
      link: "",
      color: "zinc-50",
    },
    state: {
      isDragged: false,
      isHovered: false,
      isSelected: false,
      isExpanded: false,
      isDragOver: false,
      isHovering: false,
    },
  });

  beforeEach(() => {
    dispatch = vi.fn() as MockedFunction<React.Dispatch<CacheAction>>;
    getState = vi.fn() as MockedFunction<() => CacheState>;
    
    // Properly mock dataHandler
    dataHandler = {
      loadRegion: vi.fn().mockResolvedValue({ success: true }),
      loadItemChildren: vi.fn().mockResolvedValue({ success: true }),
      prefetchRegion: vi.fn().mockResolvedValue({ success: true }),
      invalidateRegion: vi.fn(),
      invalidateAll: vi.fn(),
    };

    navigationHandler = createNavigationHandler({
      dispatch,
      getState,
      dataHandler,
    });
  });

  it("should collapse tiles more than 1 generation away when navigating", async () => {
    const testState: CacheState = {
      ...initialCacheState,
      currentCenter: "1,0",
      expandedItemIds: [
        "1",          // dbId for 1,0:1
        "2",          // dbId for 1,0:1,2
        "3",          // dbId for 1,0:1,2,3
        "4",          // dbId for 1,0:1,2,3,4
        "5",          // dbId for 1,0:2
        "6",          // dbId for 1,0:2,3,4,5
      ],
      itemsById: {
        "1,0:1": createTestTile("1,0:1", "1"),
        "1,0:1,2": createTestTile("1,0:1,2", "2"),
        "1,0:1,2,3": createTestTile("1,0:1,2,3", "3"),
        "1,0:1,2,3,4": createTestTile("1,0:1,2,3,4", "4"),
        "1,0:2": createTestTile("1,0:2", "5"),
        "1,0:2,3,4,5": createTestTile("1,0:2,3,4,5", "6"),
      },
      regionMetadata: {},
    };

    getState.mockReturnValue(testState);

    // Navigate to a tile 2 levels deep (using dbId "2" which corresponds to coordId "1,0:1,2")
    await navigationHandler.navigateToItem("2");

    // Check that setExpandedItems was called with filtered list
    const calls = dispatch.mock.calls;
    const setExpandedItemsCall = calls.find(
      (call) => call[0]?.type === ACTION_TYPES.SET_EXPANDED_ITEMS
    );

    expect(setExpandedItemsCall).toBeDefined();
    const action = setExpandedItemsCall?.[0];
    const expandedItems = action?.type === ACTION_TYPES.SET_EXPANDED_ITEMS 
      ? (action as { type: typeof ACTION_TYPES.SET_EXPANDED_ITEMS; payload: string[] }).payload 
      : [];
    
    // Should keep:
    // - "1" (dbId for 1,0:1 - ancestor of new center)
    // - "2" (dbId for 1,0:1,2 - the new center itself)
    // - "3" (dbId for 1,0:1,2,3 - 1 generation from new center)
    // Should remove:
    // - "4" (dbId for 1,0:1,2,3,4 - 2 generations from new center)
    // - "5" (dbId for 1,0:2 - not related)
    // - "6" (dbId for 1,0:2,3,4,5 - not related)
    expect(expandedItems).toContain("1");
    expect(expandedItems).toContain("2");
    expect(expandedItems).toContain("3");
    expect(expandedItems).not.toContain("4");
    expect(expandedItems).not.toContain("5");
    expect(expandedItems).not.toContain("6");
    expect(expandedItems).toHaveLength(3);
  });

  it("should keep descendants within 1 generation when navigating to root", async () => {
    const testState: CacheState = {
      ...initialCacheState,
      currentCenter: "1,0:1,2",
      expandedItemIds: [
        "10",  // dbId for 1,0:1
        "11",  // dbId for 1,0:1,2
        "12",  // dbId for 1,0:1,2,3
        "13",  // dbId for 1,0:2
      ],
      itemsById: {
        "1,0": createTestTile("1,0", "100"),
        "1,0:1": createTestTile("1,0:1", "10"),
        "1,0:1,2": createTestTile("1,0:1,2", "11"),
        "1,0:1,2,3": createTestTile("1,0:1,2,3", "12"),
        "1,0:2": createTestTile("1,0:2", "13"),
      },
      regionMetadata: {},
    };

    getState.mockReturnValue(testState);

    // Navigate to root (using dbId "100" which corresponds to coordId "1,0")
    await navigationHandler.navigateToItem("100");

    // Check that setExpandedItems was called
    const calls = dispatch.mock.calls;
    const setExpandedItemsCall = calls.find(
      (call) => call[0]?.type === ACTION_TYPES.SET_EXPANDED_ITEMS
    );

    expect(setExpandedItemsCall).toBeDefined();
    const action = setExpandedItemsCall?.[0];
    const expandedItems = action?.type === ACTION_TYPES.SET_EXPANDED_ITEMS 
      ? (action as { type: typeof ACTION_TYPES.SET_EXPANDED_ITEMS; payload: string[] }).payload 
      : [];
    
    // From root, should keep tiles within 1 generation only
    expect(expandedItems).toContain("10");      // 1,0:1 - 1 gen
    expect(expandedItems).not.toContain("11");  // 1,0:1,2 - 2 gens - too far
    expect(expandedItems).not.toContain("12");  // 1,0:1,2,3 - 3 gens - too far
    expect(expandedItems).toContain("13");      // 1,0:2 - 1 gen
    expect(expandedItems).toHaveLength(2);
  });

  it("should keep ALL ancestors expanded when navigating deeper", async () => {
    const testState: CacheState = {
      ...initialCacheState,
      currentCenter: "1,0",
      expandedItemIds: [
        "20",   // dbId for 1,0:1
        "21",   // dbId for 1,0:1,2
        "22",   // dbId for 1,0:1,2,3
        "23",   // dbId for 1,0:2 - unrelated
      ],
      itemsById: {
        "1,0:1": createTestTile("1,0:1", "20"),
        "1,0:1,2": createTestTile("1,0:1,2", "21"),
        "1,0:1,2,3": createTestTile("1,0:1,2,3", "22"),
        "1,0:2": createTestTile("1,0:2", "23"),
      },
      regionMetadata: {},
    };

    getState.mockReturnValue(testState);

    // Navigate deep into the hierarchy - but since this item doesn't exist in our test state,
    // the navigation will fail and no SET_EXPANDED_ITEMS will be dispatched
    // Let's navigate to an existing item instead
    await navigationHandler.navigateToItem("22"); // dbId for "1,0:1,2,3"

    const calls = dispatch.mock.calls;
    const setExpandedItemsCall = calls.find(
      (call) => call[0]?.type === ACTION_TYPES.SET_EXPANDED_ITEMS
    );

    expect(setExpandedItemsCall).toBeDefined();
    const action = setExpandedItemsCall?.[0];
    const expandedItems = action?.type === ACTION_TYPES.SET_EXPANDED_ITEMS 
      ? (action as { type: typeof ACTION_TYPES.SET_EXPANDED_ITEMS; payload: string[] }).payload 
      : [];
    
    // Should keep all ancestors, remove unrelated
    expect(expandedItems).toContain("20");   // 1,0:1
    expect(expandedItems).toContain("21");   // 1,0:1,2
    expect(expandedItems).toContain("22");   // 1,0:1,2,3
    expect(expandedItems).not.toContain("23"); // 1,0:2 - unrelated
    expect(expandedItems).toHaveLength(3);
  });

  it("should keep the new center expanded if it was already expanded", async () => {
    const testState: CacheState = {
      ...initialCacheState,
      currentCenter: "1,0",
      expandedItemIds: [
        "30",            // dbId for 1,0
        "31",            // dbId for 1,0:1
        "32",            // dbId for 1,0:1,2
        "33",            // dbId for 1,0:2
        "34",            // dbId for 1,0:3,4,5,6
      ],
      itemsById: {
        "1,0": createTestTile("1,0", "30"),
        "1,0:1": createTestTile("1,0:1", "31"),
        "1,0:1,2": createTestTile("1,0:1,2", "32"),
        "1,0:2": createTestTile("1,0:2", "33"),
        "1,0:3,4,5,6": createTestTile("1,0:3,4,5,6", "34"),
      },
      regionMetadata: {},
    };

    getState.mockReturnValue(testState);

    // Navigate to an already expanded tile (using dbId "31" which corresponds to coordId "1,0:1")
    await navigationHandler.navigateToItem("31");

    const calls = dispatch.mock.calls;
    const setExpandedItemsCall = calls.find(
      (call) => call[0]?.type === ACTION_TYPES.SET_EXPANDED_ITEMS
    );

    expect(setExpandedItemsCall).toBeDefined();
    const action = setExpandedItemsCall?.[0];
    const expandedItems = action?.type === ACTION_TYPES.SET_EXPANDED_ITEMS 
      ? (action as { type: typeof ACTION_TYPES.SET_EXPANDED_ITEMS; payload: string[] }).payload 
      : [];
    
    // Should keep:
    // - "30" (1,0 - ancestor)
    // - "31" (1,0:1 - the new center itself - was expanded)
    // - "32" (1,0:1,2 - 1 generation from new center)
    // - "33" (1,0:2 - sibling, kept for neighbor display)
    // Should remove:
    // - "34" (1,0:3,4,5,6 - too distant)
    expect(expandedItems).toContain("30");
    expect(expandedItems).toContain("31"); // The center itself should remain expanded
    expect(expandedItems).toContain("32");
    expect(expandedItems).toContain("33"); // Siblings are kept for neighbor tiles
    expect(expandedItems).not.toContain("34");
    expect(expandedItems).toHaveLength(4);
  });

  it("should keep ALL ancestors expanded when navigating to a great-grandchild", async () => {
    const testState: CacheState = {
      ...initialCacheState,
      currentCenter: "1,0",
      expandedItemIds: [
        "40",              // dbId for 1,0
        "41",              // dbId for 1,0:1
        "42",              // dbId for 1,0:1,2
        "43",              // dbId for 1,0:1,2,3
        "44",              // dbId for 1,0:1,2,3,4
        "45",              // dbId for 1,0:2
      ],
      itemsById: {
        "1,0": createTestTile("1,0", "40"),
        "1,0:1": createTestTile("1,0:1", "41"),
        "1,0:1,2": createTestTile("1,0:1,2", "42"),
        "1,0:1,2,3": createTestTile("1,0:1,2,3", "43"),
        "1,0:1,2,3,4": createTestTile("1,0:1,2,3,4", "44"),
        "1,0:2": createTestTile("1,0:2", "45"),
      },
      regionMetadata: {},
    };

    getState.mockReturnValue(testState);

    // Navigate to great-grandchild (4 levels deep) - using dbId "44" which corresponds to coordId "1,0:1,2,3,4"
    await navigationHandler.navigateToItem("44");

    const calls = dispatch.mock.calls;
    const setExpandedItemsCall = calls.find(
      (call) => call[0]?.type === ACTION_TYPES.SET_EXPANDED_ITEMS
    );

    expect(setExpandedItemsCall).toBeDefined();
    const action = setExpandedItemsCall?.[0];
    const expandedItems = action?.type === ACTION_TYPES.SET_EXPANDED_ITEMS 
      ? (action as { type: typeof ACTION_TYPES.SET_EXPANDED_ITEMS; payload: string[] }).payload 
      : [];
    
    // Should keep ALL ancestors regardless of generation distance:
    expect(expandedItems).toContain("40");  // 1,0 - Root (4 generations up)
    expect(expandedItems).toContain("41");  // 1,0:1 - 3 generations up
    expect(expandedItems).toContain("42");  // 1,0:1,2 - 2 generations up
    expect(expandedItems).toContain("43");  // 1,0:1,2,3 - 1 generation up
    expect(expandedItems).toContain("44");  // 1,0:1,2,3,4 - The new center itself
    
    // Should remove unrelated branches
    expect(expandedItems).not.toContain("45"); // 1,0:2
    
    expect(expandedItems).toHaveLength(5);
  });

  it("should collapse great-grandchildren when navigating to a parent", async () => {
    const testState: CacheState = {
      ...initialCacheState,
      currentCenter: "1,0",
      expandedItemIds: [
        "50",              // dbId for 1,0
        "51",              // dbId for 1,0:1
        "52",              // dbId for 1,0:1,2
        "53",              // dbId for 1,0:1,2,3 (grandchild)
        "54",              // dbId for 1,0:1,2,3,4 (great-grandchild)
        "55",              // dbId for 1,0:1,2,3,4,5 (great-great-grandchild)
      ],
      itemsById: {
        "1,0": createTestTile("1,0", "50"),
        "1,0:1": createTestTile("1,0:1", "51"),
        "1,0:1,2": createTestTile("1,0:1,2", "52"),
        "1,0:1,2,3": createTestTile("1,0:1,2,3", "53"),
        "1,0:1,2,3,4": createTestTile("1,0:1,2,3,4", "54"),
        "1,0:1,2,3,4,5": createTestTile("1,0:1,2,3,4,5", "55"),
      },
      regionMetadata: {},
    };

    getState.mockReturnValue(testState);

    // Navigate to 1,0:1 (one level deep) - using dbId "51" which corresponds to coordId "1,0:1"
    await navigationHandler.navigateToItem("51");

    const calls = dispatch.mock.calls;
    const setExpandedItemsCall = calls.find(
      (call) => call[0]?.type === ACTION_TYPES.SET_EXPANDED_ITEMS
    );

    expect(setExpandedItemsCall).toBeDefined();
    const action = setExpandedItemsCall?.[0];
    const expandedItems = action?.type === ACTION_TYPES.SET_EXPANDED_ITEMS 
      ? (action as { type: typeof ACTION_TYPES.SET_EXPANDED_ITEMS; payload: string[] }).payload 
      : [];
    
    // Should keep:
    // - "50" (1,0 - ancestor)
    // - "51" (1,0:1 - the new center)
    // - "52" (1,0:1,2 - child, 1 generation away)
    // Should remove (more than 1 generation):
    // - "53" (1,0:1,2,3 - grandchild, 2 generations away)
    // - "54" (1,0:1,2,3,4 - great-grandchild, 3 generations away)
    // - "55" (1,0:1,2,3,4,5 - great-great-grandchild, 4 generations away)
    expect(expandedItems).toContain("50");
    expect(expandedItems).toContain("51");
    expect(expandedItems).toContain("52");
    expect(expandedItems).not.toContain("53"); // Grandchild should be collapsed
    expect(expandedItems).not.toContain("54"); // Great-grandchild should be collapsed
    expect(expandedItems).not.toContain("55"); // Great-great-grandchild should be collapsed
    expect(expandedItems).toHaveLength(3);
  });
});