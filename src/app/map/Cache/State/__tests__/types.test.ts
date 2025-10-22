import { describe, it, expect } from "vitest";
import { ACTION_TYPES } from "~/app/map/Cache/State/types";
import type { CacheAction } from "~/app/map/Cache/State/types";

describe("Cache State Types", () => {
  describe("ACTION_TYPES constants", () => {
    it("should include TOGGLE_COMPOSITION_EXPANSION", () => {
      expect(ACTION_TYPES).toHaveProperty("TOGGLE_COMPOSITION_EXPANSION");
      expect(ACTION_TYPES.TOGGLE_COMPOSITION_EXPANSION).toBe(
        "TOGGLE_COMPOSITION_EXPANSION",
      );
    });

    it("should include SET_COMPOSITION_EXPANSION", () => {
      expect(ACTION_TYPES).toHaveProperty("SET_COMPOSITION_EXPANSION");
      expect(ACTION_TYPES.SET_COMPOSITION_EXPANSION).toBe(
        "SET_COMPOSITION_EXPANSION",
      );
    });

    it("should have composition action types as const strings", () => {
      const toggleType: "TOGGLE_COMPOSITION_EXPANSION" =
        ACTION_TYPES.TOGGLE_COMPOSITION_EXPANSION;
      const setType: "SET_COMPOSITION_EXPANSION" =
        ACTION_TYPES.SET_COMPOSITION_EXPANSION;

      expect(toggleType).toBe("TOGGLE_COMPOSITION_EXPANSION");
      expect(setType).toBe("SET_COMPOSITION_EXPANSION");
    });
  });

  describe("CacheAction composition types", () => {
    it("should allow TOGGLE_COMPOSITION_EXPANSION action without payload", () => {
      const action: CacheAction = {
        type: ACTION_TYPES.TOGGLE_COMPOSITION_EXPANSION,
      };

      expect(action.type).toBe("TOGGLE_COMPOSITION_EXPANSION");
      expect(action).not.toHaveProperty("payload");
    });

    it("should allow SET_COMPOSITION_EXPANSION action with boolean payload", () => {
      const action: CacheAction = {
        type: ACTION_TYPES.SET_COMPOSITION_EXPANSION,
        payload: true,
      };

      expect(action.type).toBe("SET_COMPOSITION_EXPANSION");
      expect((action as { payload: boolean }).payload).toBe(true);
    });
  });

  describe("Action type discriminated union", () => {
    it("should support type narrowing for TOGGLE_COMPOSITION_EXPANSION", () => {
      const action: CacheAction = {
        type: ACTION_TYPES.TOGGLE_COMPOSITION_EXPANSION,
      };

      if (action.type === ACTION_TYPES.TOGGLE_COMPOSITION_EXPANSION) {
        // TypeScript should know there's no payload
        expect(action.type).toBe("TOGGLE_COMPOSITION_EXPANSION");
      } else {
        throw new Error("Type narrowing failed");
      }
    });

    it("should support type narrowing for SET_COMPOSITION_EXPANSION", () => {
      const action: CacheAction = {
        type: ACTION_TYPES.SET_COMPOSITION_EXPANSION,
        payload: false,
      };

      if (action.type === ACTION_TYPES.SET_COMPOSITION_EXPANSION) {
        // TypeScript should know payload is boolean
        const isExpanded: boolean = (action as { payload: boolean }).payload;
        expect(isExpanded).toBe(false);
      } else {
        throw new Error("Type narrowing failed");
      }
    });
  });

  describe("Edge cases", () => {
    it("should support both true and false for SET_COMPOSITION_EXPANSION", () => {
      const actionTrue: CacheAction = {
        type: ACTION_TYPES.SET_COMPOSITION_EXPANSION,
        payload: true,
      };

      const actionFalse: CacheAction = {
        type: ACTION_TYPES.SET_COMPOSITION_EXPANSION,
        payload: false,
      };

      expect((actionTrue as { payload: boolean }).payload).toBe(true);
      expect((actionFalse as { payload: boolean }).payload).toBe(false);
    });
  });
});
