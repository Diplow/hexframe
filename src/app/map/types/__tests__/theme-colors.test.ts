import { describe, it, expect } from "vitest";
import { getSemanticColorClass, getTextColorForDepth } from "~/app/map/types/theme-colors";
import { Direction } from "~/app/map/constants";

describe("theme-colors", () => {
  describe("getSemanticColorClass", () => {
    it("should return center-depth-0 for center tile at depth 0", () => {
      expect(getSemanticColorClass(Direction.Center, 0)).toBe("center-depth-0");
    });

    it("should return direction-based classes for different directions", () => {
      expect(getSemanticColorClass(Direction.NorthWest, 1)).toBe("nw-depth-1");
      expect(getSemanticColorClass(Direction.NorthEast, 2)).toBe("ne-depth-2");
      expect(getSemanticColorClass(Direction.East, 3)).toBe("e-depth-3");
      expect(getSemanticColorClass(Direction.SouthEast, 4)).toBe("se-depth-4");
      expect(getSemanticColorClass(Direction.SouthWest, 5)).toBe("sw-depth-5");
      expect(getSemanticColorClass(Direction.West, 6)).toBe("w-depth-6");
    });

    it("should clamp depth to maximum of 8", () => {
      expect(getSemanticColorClass(Direction.NorthWest, 10)).toBe("nw-depth-8");
      expect(getSemanticColorClass(Direction.East, 15)).toBe("e-depth-8");
    });
  });

  describe("getTextColorForDepth", () => {
    it("should return dark text colors for shallow depths (0-3)", () => {
      expect(getTextColorForDepth(0)).toBe("text-neutral-900 dark:text-neutral-100");
      expect(getTextColorForDepth(1)).toBe("text-neutral-900 dark:text-neutral-100");
      expect(getTextColorForDepth(2)).toBe("text-neutral-900 dark:text-neutral-100");
      expect(getTextColorForDepth(3)).toBe("text-neutral-900 dark:text-neutral-100");
    });

    it("should return light text colors for deep depths (4+)", () => {
      expect(getTextColorForDepth(4)).toBe("text-white dark:text-neutral-900");
      expect(getTextColorForDepth(5)).toBe("text-white dark:text-neutral-900");
      expect(getTextColorForDepth(6)).toBe("text-white dark:text-neutral-900");
      expect(getTextColorForDepth(7)).toBe("text-white dark:text-neutral-900");
      expect(getTextColorForDepth(8)).toBe("text-white dark:text-neutral-900");
      expect(getTextColorForDepth(10)).toBe("text-white dark:text-neutral-900");
    });
  });
});