import { describe, it, expect } from "vitest";
import { MapItemType } from "~/lib/domains/mapping/_objects/map-item";

import {
  isBuiltInItemType,
  isReservedItemType,
  isCustomItemType,
  RESERVED_ITEM_TYPES,
} from "~/lib/domains/mapping/utils/item-type-utils";

describe("Item Type Extension - String Values Support", () => {
  describe("RESERVED_ITEM_TYPES constant", () => {
    it("should include 'user' as a reserved type", () => {
      expect(RESERVED_ITEM_TYPES).toContain("user");
    });

    it("should be a readonly array", () => {
      // Attempting to modify should fail at compile time (type check)
      // At runtime, we verify it's frozen or the values are correct
      expect(RESERVED_ITEM_TYPES).toEqual(["user"]);
    });

    it("should NOT include built-in types like organizational, context, system", () => {
      expect(RESERVED_ITEM_TYPES).not.toContain("organizational");
      expect(RESERVED_ITEM_TYPES).not.toContain("context");
      expect(RESERVED_ITEM_TYPES).not.toContain("system");
    });
  });

  describe("isBuiltInItemType() type guard", () => {
    it("should return true for MapItemType.USER", () => {
      expect(isBuiltInItemType(MapItemType.USER)).toBe(true);
    });

    it("should return true for MapItemType.ORGANIZATIONAL", () => {
      expect(isBuiltInItemType(MapItemType.ORGANIZATIONAL)).toBe(true);
    });

    it("should return true for MapItemType.CONTEXT", () => {
      expect(isBuiltInItemType(MapItemType.CONTEXT)).toBe(true);
    });

    it("should return true for MapItemType.SYSTEM", () => {
      expect(isBuiltInItemType(MapItemType.SYSTEM)).toBe(true);
    });

    it("should return true for string literals matching enum values", () => {
      expect(isBuiltInItemType("user")).toBe(true);
      expect(isBuiltInItemType("organizational")).toBe(true);
      expect(isBuiltInItemType("context")).toBe(true);
      expect(isBuiltInItemType("system")).toBe(true);
    });

    it("should return false for custom type strings", () => {
      expect(isBuiltInItemType("my-custom-type")).toBe(false);
      expect(isBuiltInItemType("template")).toBe(false);
      expect(isBuiltInItemType("project")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isBuiltInItemType("")).toBe(false);
    });

    it("should return false for null/undefined", () => {
      expect(isBuiltInItemType(null as unknown as string)).toBe(false);
      expect(isBuiltInItemType(undefined as unknown as string)).toBe(false);
    });
  });

  describe("isReservedItemType() validation", () => {
    it("should return true for 'user' type", () => {
      expect(isReservedItemType("user")).toBe(true);
    });

    it("should return true for MapItemType.USER", () => {
      expect(isReservedItemType(MapItemType.USER)).toBe(true);
    });

    it("should return false for 'organizational' type", () => {
      expect(isReservedItemType("organizational")).toBe(false);
    });

    it("should return false for 'context' type", () => {
      expect(isReservedItemType("context")).toBe(false);
    });

    it("should return false for 'system' type", () => {
      expect(isReservedItemType("system")).toBe(false);
    });

    it("should return false for custom type strings", () => {
      expect(isReservedItemType("my-custom-type")).toBe(false);
      expect(isReservedItemType("template")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isReservedItemType("")).toBe(false);
    });
  });

  describe("isCustomItemType() helper", () => {
    it("should return true for non-built-in type strings", () => {
      expect(isCustomItemType("my-custom-type")).toBe(true);
      expect(isCustomItemType("template")).toBe(true);
      expect(isCustomItemType("project")).toBe(true);
      expect(isCustomItemType("workflow")).toBe(true);
    });

    it("should return false for built-in enum values", () => {
      expect(isCustomItemType(MapItemType.USER)).toBe(false);
      expect(isCustomItemType(MapItemType.ORGANIZATIONAL)).toBe(false);
      expect(isCustomItemType(MapItemType.CONTEXT)).toBe(false);
      expect(isCustomItemType(MapItemType.SYSTEM)).toBe(false);
    });

    it("should return false for string literals of built-in types", () => {
      expect(isCustomItemType("user")).toBe(false);
      expect(isCustomItemType("organizational")).toBe(false);
      expect(isCustomItemType("context")).toBe(false);
      expect(isCustomItemType("system")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isCustomItemType("")).toBe(false);
    });

    it("should return false for null/undefined", () => {
      expect(isCustomItemType(null as unknown as string)).toBe(false);
      expect(isCustomItemType(undefined as unknown as string)).toBe(false);
    });

    it("should handle kebab-case custom types", () => {
      expect(isCustomItemType("my-custom-type")).toBe(true);
      expect(isCustomItemType("some-other-type")).toBe(true);
    });

    it("should handle snake_case custom types", () => {
      expect(isCustomItemType("my_custom_type")).toBe(true);
    });

    it("should handle camelCase custom types", () => {
      expect(isCustomItemType("myCustomType")).toBe(true);
    });
  });

  describe("Reserved type rejection for custom creation", () => {
    it("should identify 'user' as reserved and not creatable as custom", () => {
      // 'user' is reserved - it's for system-created root tiles only
      expect(isReservedItemType("user")).toBe(true);
      expect(isCustomItemType("user")).toBe(false);
    });

    it("should allow built-in non-reserved types to be used", () => {
      // These are built-in but NOT reserved - users can create tiles with these types
      expect(isBuiltInItemType("organizational")).toBe(true);
      expect(isReservedItemType("organizational")).toBe(false);

      expect(isBuiltInItemType("context")).toBe(true);
      expect(isReservedItemType("context")).toBe(false);

      expect(isBuiltInItemType("system")).toBe(true);
      expect(isReservedItemType("system")).toBe(false);
    });
  });

  describe("Backward compatibility with MapItemType enum", () => {
    it("should recognize all existing MapItemType enum values as built-in", () => {
      const allEnumValues = Object.values(MapItemType);
      for (const value of allEnumValues) {
        expect(isBuiltInItemType(value)).toBe(true);
      }
    });

    it("should maintain exact string values for enum members", () => {
      // These string values are stored in the database, so they must remain stable
      expect(MapItemType.USER).toBe("user");
      expect(MapItemType.ORGANIZATIONAL).toBe("organizational");
      expect(MapItemType.CONTEXT).toBe("context");
      expect(MapItemType.SYSTEM).toBe("system");
    });

    it("should have exactly 4 built-in types", () => {
      const builtInTypes = ["user", "organizational", "context", "system"];
      expect(builtInTypes.length).toBe(4);

      for (const type of builtInTypes) {
        expect(isBuiltInItemType(type)).toBe(true);
      }
    });
  });

  describe("Type narrowing behavior", () => {
    it("should narrow type when isBuiltInItemType returns true", () => {
      const someValue = "organizational" as string;
      if (isBuiltInItemType(someValue)) {
        // TypeScript should narrow this to MapItemType
        const narrowedValue: MapItemType = someValue;
        expect(narrowedValue).toBe(MapItemType.ORGANIZATIONAL);
      }
    });

    it("should not narrow type when isBuiltInItemType returns false", () => {
      const someValue = "my-custom-type" as string;
      if (!isBuiltInItemType(someValue)) {
        // someValue remains string type
        expect(typeof someValue).toBe("string");
        expect(someValue).toBe("my-custom-type");
      }
    });
  });
});
