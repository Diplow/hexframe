import { describe, it, expect } from "vitest";
import {
  CreateMapItemParamsSchema,
  validateCreateMapItemParams,
  type CreateMapItemParams,
} from "~/lib/domains/mapping/types/parameters";
import { MapItemType } from "~/lib/domains/mapping/_objects";
import { Direction } from "~/lib/domains/mapping/utils";

describe("CreateMapItemParamsSchema - Negative Direction Support", () => {
  describe("happy path - negative directions in coords.path", () => {
    it("should accept single negative direction in path", () => {
      const params: CreateMapItemParams = {
        itemType: MapItemType.BASE,
        coords: {
          userId: "user-test-1",
          groupId: 0,
          path: [Direction.ComposedEast], // -3
        },
        title: "Test Item",
        content: "Test Content",
      };

      const result = CreateMapItemParamsSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it("should accept negative direction after positive directions", () => {
      const params: CreateMapItemParams = {
        itemType: MapItemType.BASE,
        coords: {
          userId: "user-test-1",
          groupId: 0,
          path: [Direction.NorthWest, Direction.ComposedEast], // [1, -3]
        },
        title: "Test Item",
        content: "Test Content",
      };

      const result = CreateMapItemParamsSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it("should accept multiple negative directions in path", () => {
      const params: CreateMapItemParams = {
        itemType: MapItemType.BASE,
        coords: {
          userId: "user-test-1",
          groupId: 0,
          path: [
            Direction.NorthWest,
            Direction.ComposedEast,
            Direction.ComposedSouthWest,
          ], // [1, -3, -5]
        },
        title: "Test Item",
        content: "Test Content",
      };

      const result = CreateMapItemParamsSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it("should accept all negative direction values from -1 to -6", () => {
      const negativeDirections = [
        Direction.ComposedNorthWest, // -1
        Direction.ComposedNorthEast, // -2
        Direction.ComposedEast, // -3
        Direction.ComposedSouthEast, // -4
        Direction.ComposedSouthWest, // -5
        Direction.ComposedWest, // -6
      ];

      negativeDirections.forEach((dir) => {
        const params: CreateMapItemParams = {
          itemType: MapItemType.BASE,
          coords: {
            userId: "user-test-1",
            groupId: 0,
            path: [dir],
          },
          title: "Test Item",
          content: "Test Content",
        };

        const result = CreateMapItemParamsSchema.safeParse(params);
        expect(result.success).toBe(true);
      });
    });

    it("should accept mix of positive, zero, and negative directions", () => {
      const params: CreateMapItemParams = {
        itemType: MapItemType.BASE,
        coords: {
          userId: "user-test-1",
          groupId: 0,
          path: [
            Direction.NorthWest, // 1
            Direction.Center, // 0
            Direction.ComposedEast, // -3
            Direction.SouthEast, // 4
          ],
        },
        title: "Test Item",
        content: "Test Content",
      };

      const result = CreateMapItemParamsSchema.safeParse(params);
      expect(result.success).toBe(true);
    });
  });

  describe("happy path - existing positive directions still work", () => {
    it("should accept positive directions 1-6", () => {
      const params: CreateMapItemParams = {
        itemType: MapItemType.BASE,
        coords: {
          userId: "user-test-1",
          groupId: 0,
          path: [
            Direction.NorthWest,
            Direction.NorthEast,
            Direction.East,
            Direction.SouthEast,
            Direction.SouthWest,
            Direction.West,
          ],
        },
        title: "Test Item",
        content: "Test Content",
      };

      const result = CreateMapItemParamsSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it("should accept direction 0 (Center)", () => {
      const params: CreateMapItemParams = {
        itemType: MapItemType.BASE,
        coords: {
          userId: "user-test-1",
          groupId: 0,
          path: [Direction.NorthWest, Direction.Center],
        },
        title: "Test Item",
        content: "Test Content",
      };

      const result = CreateMapItemParamsSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it("should accept empty path for root items", () => {
      const params: CreateMapItemParams = {
        itemType: MapItemType.USER,
        coords: {
          userId: "user-test-1",
          groupId: 0,
          path: [],
        },
        title: "Root Item",
        content: "Root Content",
      };

      const result = CreateMapItemParamsSchema.safeParse(params);
      expect(result.success).toBe(true);
    });
  });

  describe("edge cases - invalid negative directions", () => {
    it("should reject direction less than -6", () => {
      const params = {
        itemType: MapItemType.BASE,
        coords: {
          userId: "user-test-1",
          groupId: 0,
          path: [-7], // Invalid: less than -6
        },
        title: "Test Item",
        content: "Test Content",
      };

      const result = CreateMapItemParamsSchema.safeParse(params);
      expect(result.success).toBe(false);
    });

    it("should reject direction greater than 6", () => {
      const params = {
        itemType: MapItemType.BASE,
        coords: {
          userId: "user-test-1",
          groupId: 0,
          path: [7], // Invalid: greater than 6
        },
        title: "Test Item",
        content: "Test Content",
      };

      const result = CreateMapItemParamsSchema.safeParse(params);
      expect(result.success).toBe(false);
    });
  });

  describe("validateCreateMapItemParams function", () => {
    it("should validate params with negative directions successfully", () => {
      const params = {
        itemType: MapItemType.BASE,
        coords: {
          userId: "user-test-1",
          groupId: 0,
          path: [Direction.NorthWest, Direction.ComposedEast],
        },
        title: "Test Item",
        content: "Test Content",
      };

      const validated = validateCreateMapItemParams(params);

      expect(validated.coords.path).toEqual([
        Direction.NorthWest,
        Direction.ComposedEast,
      ]);
    });

    it("should throw error for invalid negative direction", () => {
      const params = {
        itemType: MapItemType.BASE,
        coords: {
          userId: "user-test-1",
          groupId: 0,
          path: [-7], // Invalid
        },
        title: "Test Item",
        content: "Test Content",
      };

      expect(() => validateCreateMapItemParams(params)).toThrow();
    });

    it("should validate all negative direction enum values", () => {
      const params = {
        itemType: MapItemType.BASE,
        coords: {
          userId: "user-test-1",
          groupId: 0,
          path: [
            Direction.ComposedNorthWest,
            Direction.ComposedNorthEast,
            Direction.ComposedEast,
            Direction.ComposedSouthEast,
            Direction.ComposedSouthWest,
            Direction.ComposedWest,
          ],
        },
        title: "Test Item",
        content: "Test Content",
      };

      const validated = validateCreateMapItemParams(params);

      expect(validated.coords.path).toEqual([-1, -2, -3, -4, -5, -6]);
    });
  });

  describe("type safety and inference", () => {
    it("should correctly type coords.path to allow Direction enum values", () => {
      const params: CreateMapItemParams = {
        itemType: MapItemType.BASE,
        coords: {
          userId: "user-test-1",
          groupId: 0,
          path: [Direction.ComposedEast],
        },
        title: "Test",
        content: "Content",
      };

      // Type assertion - this should compile without error
      const direction: number = params.coords.path[0]!;
      expect(direction).toBe(-3);
    });

    it("should maintain type safety for mixed direction paths", () => {
      const params: CreateMapItemParams = {
        itemType: MapItemType.BASE,
        coords: {
          userId: "user-test-1",
          groupId: 0,
          path: [
            Direction.NorthWest,
            Direction.ComposedEast,
            Direction.Center,
          ],
        },
        title: "Test",
        content: "Content",
      };

      expect(params.coords.path).toHaveLength(3);
      expect(params.coords.path[0]).toBe(1);
      expect(params.coords.path[1]).toBe(-3);
      expect(params.coords.path[2]).toBe(0);
    });
  });

  describe("integration with MapItemType", () => {
    it("should work with BASE items having composed children paths", () => {
      const params: CreateMapItemParams = {
        itemType: MapItemType.BASE,
        coords: {
          userId: "user-test-1",
          groupId: 0,
          path: [Direction.NorthWest, Direction.ComposedEast],
        },
        title: "Base Item",
        content: "Content",
        parentId: 123,
      };

      const result = CreateMapItemParamsSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it("should work with BASE items at composition (direction 0)", () => {
      const params: CreateMapItemParams = {
        itemType: MapItemType.BASE,
        coords: {
          userId: "user-test-1",
          groupId: 0,
          path: [Direction.NorthWest, Direction.Center],
        },
        title: "Composition Item",
        content: "Content",
        parentId: 123,
      };

      const result = CreateMapItemParamsSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it("should work with USER items at root", () => {
      const params: CreateMapItemParams = {
        itemType: MapItemType.USER,
        coords: {
          userId: "user-test-1",
          groupId: 0,
          path: [],
        },
        title: "User Root",
        content: "Content",
      };

      const result = CreateMapItemParamsSchema.safeParse(params);
      expect(result.success).toBe(true);
    });
  });

  describe("backwards compatibility", () => {
    it("should not break existing valid params without negative directions", () => {
      const params: CreateMapItemParams = {
        itemType: MapItemType.BASE,
        coords: {
          userId: "user-test-1",
          groupId: 0,
          path: [Direction.NorthWest, Direction.East, Direction.SouthEast],
        },
        title: "Regular Item",
        content: "Regular Content",
        parentId: 123,
      };

      const result = CreateMapItemParamsSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it("should handle typical BASE item creation scenario", () => {
      const params: CreateMapItemParams = {
        itemType: MapItemType.BASE,
        coords: {
          userId: "user-test-42",
          groupId: 5,
          path: [1, 2, 3],
        },
        title: "New Tile",
        content: "New tile content",
        preview: "Preview text",
        link: "https://example.com",
        parentId: 999,
      };

      const validated = validateCreateMapItemParams(params);
      expect(validated.coords.path).toEqual([1, 2, 3]);
    });
  });
});
