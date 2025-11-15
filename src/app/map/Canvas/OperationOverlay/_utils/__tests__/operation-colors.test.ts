import { describe, it, expect } from 'vitest';
import { getOperationColors, getDarkModeOperationColors } from '~/app/map/Canvas/OperationOverlay/_utils/operation-colors';
import type { OperationType } from '~/app/map/Canvas/OperationOverlay/types';

describe('operation-colors', () => {
  describe('getOperationColors', () => {
    it('should return colors for all operation types', () => {
      const operations: OperationType[] = ['create', 'update', 'delete', 'move', 'copy'];

      operations.forEach((op) => {
        const colors = getOperationColors(op);
        expect(colors).toHaveProperty('stroke');
        expect(colors).toHaveProperty('fill');
        expect(colors).toHaveProperty('glow');
        expect(typeof colors.stroke).toBe('string');
        expect(typeof colors.fill).toBe('string');
        expect(typeof colors.glow).toBe('string');
      });
    });

    it('should return different colors for different operations', () => {
      const createColors = getOperationColors('create');
      const deleteColors = getOperationColors('delete');
      const updateColors = getOperationColors('update');

      expect(createColors.stroke).not.toBe(deleteColors.stroke);
      expect(createColors.stroke).not.toBe(updateColors.stroke);
      expect(deleteColors.stroke).not.toBe(updateColors.stroke);
    });

    it('should return same colors for move and copy', () => {
      const moveColors = getOperationColors('move');
      const copyColors = getOperationColors('copy');

      expect(moveColors.stroke).toBe(copyColors.stroke);
      expect(moveColors.fill).toBe(copyColors.fill);
      expect(moveColors.glow).toBe(copyColors.glow);
    });

    it('should return valid RGB/RGBA color strings', () => {
      const colors = getOperationColors('create');

      expect(colors.stroke).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
      expect(colors.fill).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/);
      expect(colors.glow).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/);
    });
  });

  describe('getDarkModeOperationColors', () => {
    it('should provide dark mode variants', () => {
      const lightCreate = getOperationColors('create');
      const darkCreate = getDarkModeOperationColors('create');

      expect(lightCreate.stroke).not.toBe(darkCreate.stroke);
    });

    it('should return colors for all operation types', () => {
      const operations: OperationType[] = ['create', 'update', 'delete', 'move', 'copy'];

      operations.forEach((op) => {
        const colors = getDarkModeOperationColors(op);
        expect(colors).toHaveProperty('stroke');
        expect(colors).toHaveProperty('fill');
        expect(colors).toHaveProperty('glow');
      });
    });

    it('should return same colors for move and copy in dark mode', () => {
      const moveColors = getDarkModeOperationColors('move');
      const copyColors = getDarkModeOperationColors('copy');

      expect(moveColors.stroke).toBe(copyColors.stroke);
      expect(moveColors.fill).toBe(copyColors.fill);
      expect(moveColors.glow).toBe(copyColors.glow);
    });
  });
});
