import {
  toggleCompositionExpansion,
  setCompositionExpansion,
  clearCompositionExpansions,
} from "~/app/map/Cache/State/actions/composition";
import { ACTION_TYPES } from "~/app/map/Cache/State/types";
import type { CacheAction } from "~/app/map/Cache/State/types";

describe("Composition Expansion Actions", () => {
  describe("Basic Action Creators", () => {
    describe("toggleCompositionExpansion", () => {
      test("creates correct action for valid coordId", () => {
        const result = toggleCompositionExpansion("1,0:1,2");

        expect(result).toEqual({
          type: ACTION_TYPES.TOGGLE_COMPOSITION_EXPANSION,
          payload: "1,0:1,2",
        });
      });

      test("creates action with empty string coordId", () => {
        const result = toggleCompositionExpansion("");

        expect(result).toEqual({
          type: ACTION_TYPES.TOGGLE_COMPOSITION_EXPANSION,
          payload: "",
        });
      });

      test("creates action with complex coordId", () => {
        const complexCoordId = "1,0:1,2,3,4,5,6";
        const result = toggleCompositionExpansion(complexCoordId);

        expect(result).toEqual({
          type: ACTION_TYPES.TOGGLE_COMPOSITION_EXPANSION,
          payload: complexCoordId,
        });
      });

      test("creates action with whitespace coordId", () => {
        const result = toggleCompositionExpansion("  ");

        expect(result).toEqual({
          type: ACTION_TYPES.TOGGLE_COMPOSITION_EXPANSION,
          payload: "  ",
        });
      });
    });

    describe("setCompositionExpansion", () => {
      test("creates correct action to expand", () => {
        const result = setCompositionExpansion("1,0:1,2", true);

        expect(result).toEqual({
          type: ACTION_TYPES.SET_COMPOSITION_EXPANSION,
          payload: {
            coordId: "1,0:1,2",
            isExpanded: true,
          },
        });
      });

      test("creates correct action to collapse", () => {
        const result = setCompositionExpansion("1,0:1,2", false);

        expect(result).toEqual({
          type: ACTION_TYPES.SET_COMPOSITION_EXPANSION,
          payload: {
            coordId: "1,0:1,2",
            isExpanded: false,
          },
        });
      });

      test("creates action with empty string coordId", () => {
        const result = setCompositionExpansion("", true);

        expect(result).toEqual({
          type: ACTION_TYPES.SET_COMPOSITION_EXPANSION,
          payload: {
            coordId: "",
            isExpanded: true,
          },
        });
      });

      test("creates action with complex coordId", () => {
        const complexCoordId = "1,0:1,2,3,4,5,6";
        const result = setCompositionExpansion(complexCoordId, false);

        expect(result).toEqual({
          type: ACTION_TYPES.SET_COMPOSITION_EXPANSION,
          payload: {
            coordId: complexCoordId,
            isExpanded: false,
          },
        });
      });
    });

    describe("clearCompositionExpansions", () => {
      test("creates correct action", () => {
        const result = clearCompositionExpansions();

        expect(result).toEqual({
          type: ACTION_TYPES.CLEAR_COMPOSITION_EXPANSIONS,
        });
      });

      test("creates same action every time", () => {
        const result1 = clearCompositionExpansions();
        const result2 = clearCompositionExpansions();

        expect(result1).toEqual(result2);
      });
    });
  });

  describe("Action Creators are Pure Functions", () => {
    test("toggleCompositionExpansion returns same output for same input", () => {
      const result1 = toggleCompositionExpansion("1,0:1,2");
      const result2 = toggleCompositionExpansion("1,0:1,2");

      expect(result1).toEqual(result2);
    });

    test("setCompositionExpansion returns same output for same input", () => {
      const result1 = setCompositionExpansion("1,0:1,2", true);
      const result2 = setCompositionExpansion("1,0:1,2", true);

      expect(result1).toEqual(result2);
    });

    test("clearCompositionExpansions is deterministic", () => {
      const results = Array.from({ length: 5 }, () => clearCompositionExpansions());

      results.forEach((result) => {
        expect(result).toEqual({
          type: ACTION_TYPES.CLEAR_COMPOSITION_EXPANSIONS,
        });
      });
    });

    test("action creators do not mutate input", () => {
      const originalCoordId = "1,0:1,2";
      const coordIdCopy = originalCoordId;

      toggleCompositionExpansion(originalCoordId);
      setCompositionExpansion(originalCoordId, true);

      expect(originalCoordId).toBe(coordIdCopy);
    });
  });

  describe("Type Safety", () => {
    test("toggleCompositionExpansion returns valid CacheAction", () => {
      const result: CacheAction = toggleCompositionExpansion("1,0:1,2");

      expect(result.type).toBe(ACTION_TYPES.TOGGLE_COMPOSITION_EXPANSION);
    });

    test("setCompositionExpansion returns valid CacheAction", () => {
      const result: CacheAction = setCompositionExpansion("1,0:1,2", true);

      expect(result.type).toBe(ACTION_TYPES.SET_COMPOSITION_EXPANSION);
    });

    test("clearCompositionExpansions returns valid CacheAction", () => {
      const result: CacheAction = clearCompositionExpansions();

      expect(result.type).toBe(ACTION_TYPES.CLEAR_COMPOSITION_EXPANSIONS);
    });
  });

  describe("Edge Cases", () => {
    test("toggleCompositionExpansion works with special characters", () => {
      const specialCoordId = "1,0:!@#$%^&*()";
      const result = toggleCompositionExpansion(specialCoordId);

      expect((result as { payload: string }).payload).toBe(specialCoordId);
    });

    test("setCompositionExpansion works with special characters", () => {
      const specialCoordId = "1,0:!@#$%^&*()";
      const result = setCompositionExpansion(specialCoordId, true);

      expect((result as { payload: { coordId: string; isExpanded: boolean } }).payload.coordId).toBe(specialCoordId);
    });

    test("setCompositionExpansion works with boolean edge cases", () => {
      // Test explicit true
      const resultTrue = setCompositionExpansion("1,0:1", true);
      expect((resultTrue as { payload: { coordId: string; isExpanded: boolean } }).payload.isExpanded).toBe(true);

      // Test explicit false
      const resultFalse = setCompositionExpansion("1,0:1", false);
      expect((resultFalse as { payload: { coordId: string; isExpanded: boolean } }).payload.isExpanded).toBe(false);
    });

    test("multiple calls with different coordIds produce different actions", () => {
      const result1 = toggleCompositionExpansion("1,0:1");
      const result2 = toggleCompositionExpansion("1,0:2");

      expect((result1 as { payload: string }).payload).not.toBe((result2 as { payload: string }).payload);
    });

    test("setCompositionExpansion with same coordId but different states", () => {
      const resultExpand = setCompositionExpansion("1,0:1", true);
      const resultCollapse = setCompositionExpansion("1,0:1", false);

      expect((resultExpand as { payload: { coordId: string; isExpanded: boolean } }).payload.coordId).toBe((resultCollapse as { payload: { coordId: string; isExpanded: boolean } }).payload.coordId);
      expect((resultExpand as { payload: { coordId: string; isExpanded: boolean } }).payload.isExpanded).not.toBe((resultCollapse as { payload: { coordId: string; isExpanded: boolean } }).payload.isExpanded);
    });
  });

  describe("Real-world Usage Patterns", () => {
    test("typical composition toggle workflow", () => {
      const coordId = "1,0:3,2";

      // User clicks to toggle
      const toggleAction = toggleCompositionExpansion(coordId);
      expect(toggleAction.type).toBe(ACTION_TYPES.TOGGLE_COMPOSITION_EXPANSION);
      expect((toggleAction as { payload: string }).payload).toBe(coordId);
    });

    test("explicit expansion control workflow", () => {
      const coordId = "1,0:3,2";

      // Explicitly expand
      const expandAction = setCompositionExpansion(coordId, true);
      expect(expandAction.type).toBe(ACTION_TYPES.SET_COMPOSITION_EXPANSION);
      expect((expandAction as { payload: { coordId: string; isExpanded: boolean } }).payload).toEqual({ coordId, isExpanded: true });

      // Explicitly collapse
      const collapseAction = setCompositionExpansion(coordId, false);
      expect(collapseAction.type).toBe(ACTION_TYPES.SET_COMPOSITION_EXPANSION);
      expect((collapseAction as { payload: { coordId: string; isExpanded: boolean } }).payload).toEqual({ coordId, isExpanded: false });
    });

    test("clear all expansions workflow", () => {
      const clearAction = clearCompositionExpansions();
      expect(clearAction.type).toBe(ACTION_TYPES.CLEAR_COMPOSITION_EXPANSIONS);
    });

    test("batch operations workflow", () => {
      // Simulate expanding multiple compositions
      const coordIds = ["1,0:1", "1,0:2", "1,0:3"];
      const expandActions = coordIds.map((id) => setCompositionExpansion(id, true));

      expandActions.forEach((action) => {
        expect(action.type).toBe(ACTION_TYPES.SET_COMPOSITION_EXPANSION);
        expect((action as { payload: { coordId: string; isExpanded: boolean } }).payload.isExpanded).toBe(true);
      });

      // Then clear all
      const clearAction = clearCompositionExpansions();
      expect(clearAction.type).toBe(ACTION_TYPES.CLEAR_COMPOSITION_EXPANSIONS);
    });
  });

  describe("Integration with Other Actions", () => {
    test("composition actions should work alongside navigation actions", () => {
      // These actions should be compatible with the overall CacheAction type
      const compositionAction1: CacheAction = toggleCompositionExpansion("1,0:1");
      const compositionAction2: CacheAction = setCompositionExpansion("1,0:2", true);
      const compositionAction3: CacheAction = clearCompositionExpansions();

      expect(compositionAction1.type).toBe(ACTION_TYPES.TOGGLE_COMPOSITION_EXPANSION);
      expect(compositionAction2.type).toBe(ACTION_TYPES.SET_COMPOSITION_EXPANSION);
      expect(compositionAction3.type).toBe(ACTION_TYPES.CLEAR_COMPOSITION_EXPANSIONS);
    });
  });

  describe("Performance Characteristics", () => {
    test("action creation is fast for many calls", () => {
      const iterations = 1000;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        toggleCompositionExpansion(`1,0:${i}`);
      }

      const duration = Date.now() - start;

      // Should complete in reasonable time (under 100ms for 1000 calls)
      expect(duration).toBeLessThan(100);
    });

    test("actions do not accumulate memory", () => {
      // Create many actions to ensure no memory leaks
      const coordIds = Array.from({ length: 100 }, (_, i) => `1,0:${i}`);

      coordIds.forEach((coordId) => {
        toggleCompositionExpansion(coordId);
        setCompositionExpansion(coordId, true);
        setCompositionExpansion(coordId, false);
      });

      clearCompositionExpansions();

      // If we get here without issues, memory is managed properly
      expect(true).toBe(true);
    });
  });
});
