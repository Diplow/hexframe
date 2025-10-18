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

    it("should include CLEAR_COMPOSITION_EXPANSIONS", () => {
      expect(ACTION_TYPES).toHaveProperty("CLEAR_COMPOSITION_EXPANSIONS");
      expect(ACTION_TYPES.CLEAR_COMPOSITION_EXPANSIONS).toBe(
        "CLEAR_COMPOSITION_EXPANSIONS",
      );
    });

    it("should have composition action types as const strings", () => {
      const toggleType: "TOGGLE_COMPOSITION_EXPANSION" =
        ACTION_TYPES.TOGGLE_COMPOSITION_EXPANSION;
      const setType: "SET_COMPOSITION_EXPANSION" =
        ACTION_TYPES.SET_COMPOSITION_EXPANSION;
      const clearType: "CLEAR_COMPOSITION_EXPANSIONS" =
        ACTION_TYPES.CLEAR_COMPOSITION_EXPANSIONS;

      expect(toggleType).toBe("TOGGLE_COMPOSITION_EXPANSION");
      expect(setType).toBe("SET_COMPOSITION_EXPANSION");
      expect(clearType).toBe("CLEAR_COMPOSITION_EXPANSIONS");
    });
  });

  describe("CacheAction composition types", () => {
    it("should allow TOGGLE_COMPOSITION_EXPANSION action with string payload", () => {
      const action: CacheAction = {
        type: ACTION_TYPES.TOGGLE_COMPOSITION_EXPANSION,
        payload: "1,0:3,2",
      };

      expect(action.type).toBe("TOGGLE_COMPOSITION_EXPANSION");
      expect(action.payload).toBe("1,0:3,2");
    });

    it("should allow SET_COMPOSITION_EXPANSION action with coordId and isExpanded", () => {
      const action: CacheAction = {
        type: ACTION_TYPES.SET_COMPOSITION_EXPANSION,
        payload: { coordId: "1,0:3,2", isExpanded: true },
      };

      expect(action.type).toBe("SET_COMPOSITION_EXPANSION");
      expect(action.payload.coordId).toBe("1,0:3,2");
      expect(action.payload.isExpanded).toBe(true);
    });

    it("should allow CLEAR_COMPOSITION_EXPANSIONS action without payload", () => {
      const action: CacheAction = {
        type: ACTION_TYPES.CLEAR_COMPOSITION_EXPANSIONS,
      };

      expect(action.type).toBe("CLEAR_COMPOSITION_EXPANSIONS");
      expect(action).not.toHaveProperty("payload");
    });
  });

  describe("Action type discriminated union", () => {
    it("should support type narrowing for TOGGLE_COMPOSITION_EXPANSION", () => {
      const action: CacheAction = {
        type: ACTION_TYPES.TOGGLE_COMPOSITION_EXPANSION,
        payload: "test-id",
      };

      if (action.type === ACTION_TYPES.TOGGLE_COMPOSITION_EXPANSION) {
        // TypeScript should know payload is string
        const coordId: string = action.payload;
        expect(coordId).toBe("test-id");
      } else {
        throw new Error("Type narrowing failed");
      }
    });

    it("should support type narrowing for SET_COMPOSITION_EXPANSION", () => {
      const action: CacheAction = {
        type: ACTION_TYPES.SET_COMPOSITION_EXPANSION,
        payload: { coordId: "test-id", isExpanded: false },
      };

      if (action.type === ACTION_TYPES.SET_COMPOSITION_EXPANSION) {
        // TypeScript should know payload structure
        const { coordId, isExpanded } = action.payload;
        expect(coordId).toBe("test-id");
        expect(isExpanded).toBe(false);
      } else {
        throw new Error("Type narrowing failed");
      }
    });

    it("should support type narrowing for CLEAR_COMPOSITION_EXPANSIONS", () => {
      const action: CacheAction = {
        type: ACTION_TYPES.CLEAR_COMPOSITION_EXPANSIONS,
      };

      if (action.type === ACTION_TYPES.CLEAR_COMPOSITION_EXPANSIONS) {
        // TypeScript should know there's no payload
        expect(action.type).toBe("CLEAR_COMPOSITION_EXPANSIONS");
      } else {
        throw new Error("Type narrowing failed");
      }
    });
  });

  describe("Edge cases", () => {
    it("should allow empty string as coordId in TOGGLE_COMPOSITION_EXPANSION", () => {
      const action: CacheAction = {
        type: ACTION_TYPES.TOGGLE_COMPOSITION_EXPANSION,
        payload: "",
      };

      expect(action.payload).toBe("");
    });

    it("should allow complex coordId formats in SET_COMPOSITION_EXPANSION", () => {
      const action: CacheAction = {
        type: ACTION_TYPES.SET_COMPOSITION_EXPANSION,
        payload: { coordId: "1,0:3,2,1,5,4", isExpanded: true },
      };

      expect(action.payload.coordId).toBe("1,0:3,2,1,5,4");
    });

    it("should support both true and false for isExpanded", () => {
      const actionTrue: CacheAction = {
        type: ACTION_TYPES.SET_COMPOSITION_EXPANSION,
        payload: { coordId: "id1", isExpanded: true },
      };

      const actionFalse: CacheAction = {
        type: ACTION_TYPES.SET_COMPOSITION_EXPANSION,
        payload: { coordId: "id2", isExpanded: false },
      };

      expect(actionTrue.payload.isExpanded).toBe(true);
      expect(actionFalse.payload.isExpanded).toBe(false);
    });
  });
});
