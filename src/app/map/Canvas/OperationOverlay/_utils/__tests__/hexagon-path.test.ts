import { describe, it, expect } from 'vitest';
import { generateHexagonPath, getHexagonViewBox } from '~/app/map/Canvas/OperationOverlay/_utils/hexagon-path';

describe('hexagon-path', () => {
  describe('generateHexagonPath', () => {
    it('should generate path matching BaseTileLayout', () => {
      const path = generateHexagonPath();
      expect(path).toBe('M50 0 L100 28.87 L100 86.6 L50 115.47 L0 86.6 L0 28.87Z');
    });

    it('should contain valid SVG path commands', () => {
      const path = generateHexagonPath();
      expect(path).toContain('M');
      expect(path).toContain('L');
      expect(path).toContain('Z');
    });

    it('should be consistent', () => {
      const path1 = generateHexagonPath();
      const path2 = generateHexagonPath();
      expect(path1).toBe(path2);
    });
  });

  describe('getHexagonViewBox', () => {
    it('should return viewBox matching BaseTileLayout', () => {
      const viewBox = getHexagonViewBox();
      expect(viewBox).toBe('0 0 100 115.47');
    });

    it('should be consistent', () => {
      const viewBox1 = getHexagonViewBox();
      const viewBox2 = getHexagonViewBox();
      expect(viewBox1).toBe(viewBox2);
    });
  });
});
