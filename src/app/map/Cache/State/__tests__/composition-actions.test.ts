import {
  toggleCompositionExpansion,
  setCompositionExpansion,
} from "~/app/map/Cache/State/actions/composition";
import { ACTION_TYPES } from "~/app/map/Cache/State/types";
import type { CacheAction } from "~/app/map/Cache/State/types";

describe("Composition Expansion Actions", () => {
  describe("Basic Action Creators", () => {
    describe("toggleCompositionExpansion", () => {
      test("creates correct action with no parameters", () => {
        const result = toggleCompositionExpansion();

        expect(result).toEqual({
          type: ACTION_TYPES.TOGGLE_COMPOSITION_EXPANSION,
        });
      });
    });

    describe("setCompositionExpansion", () => {
      test("creates correct action to expand", () => {
        const result = setCompositionExpansion(true);

        expect(result).toEqual({
          type: ACTION_TYPES.SET_COMPOSITION_EXPANSION,
          payload: true,
        });
      });

      test("creates correct action to collapse", () => {
        const result = setCompositionExpansion(false);

        expect(result).toEqual({
          type: ACTION_TYPES.SET_COMPOSITION_EXPANSION,
          payload: false,
        });
      });
    });
  });

  describe("Action Creators are Pure Functions", () => {
    test("toggleCompositionExpansion returns same output", () => {
      const result1 = toggleCompositionExpansion();
      const result2 = toggleCompositionExpansion();

      expect(result1).toEqual(result2);
    });

    test("setCompositionExpansion returns same output for same input", () => {
      const result1 = setCompositionExpansion(true);
      const result2 = setCompositionExpansion(true);

      expect(result1).toEqual(result2);
    });
  });

  describe("Type Safety", () => {
    test("toggleCompositionExpansion returns valid CacheAction", () => {
      const result: CacheAction = toggleCompositionExpansion();

      expect(result.type).toBe(ACTION_TYPES.TOGGLE_COMPOSITION_EXPANSION);
    });

    test("setCompositionExpansion returns valid CacheAction", () => {
      const result: CacheAction = setCompositionExpansion(true);

      expect(result.type).toBe(ACTION_TYPES.SET_COMPOSITION_EXPANSION);
    });
  });

  describe("Real-world Usage Patterns", () => {
    test("typical composition toggle workflow", () => {
      // User clicks to toggle
      const toggleAction = toggleCompositionExpansion();
      expect(toggleAction.type).toBe(ACTION_TYPES.TOGGLE_COMPOSITION_EXPANSION);
    });

    test("explicit expansion control workflow", () => {
      // Explicitly expand
      const expandAction = setCompositionExpansion(true);
      expect(expandAction.type).toBe(ACTION_TYPES.SET_COMPOSITION_EXPANSION);
      expect((expandAction as { payload: boolean }).payload).toBe(true);

      // Explicitly collapse
      const collapseAction = setCompositionExpansion(false);
      expect(collapseAction.type).toBe(ACTION_TYPES.SET_COMPOSITION_EXPANSION);
      expect((collapseAction as { payload: boolean }).payload).toBe(false);
    });
  });

  describe("Integration with Other Actions", () => {
    test("composition actions should work alongside navigation actions", () => {
      // These actions should be compatible with the overall CacheAction type
      const compositionAction1: CacheAction = toggleCompositionExpansion();
      const compositionAction2: CacheAction = setCompositionExpansion(true);

      expect(compositionAction1.type).toBe(ACTION_TYPES.TOGGLE_COMPOSITION_EXPANSION);
      expect(compositionAction2.type).toBe(ACTION_TYPES.SET_COMPOSITION_EXPANSION);
    });
  });

  describe("Performance Characteristics", () => {
    test("action creation is fast for many calls", () => {
      const iterations = 1000;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        toggleCompositionExpansion();
        setCompositionExpansion(true);
        setCompositionExpansion(false);
      }

      const duration = Date.now() - start;

      // Should complete in reasonable time (under 100ms for 1000 calls)
      expect(duration).toBeLessThan(100);
    });
  });
});
