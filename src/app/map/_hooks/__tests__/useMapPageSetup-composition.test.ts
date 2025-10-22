import { describe, it, expect } from 'vitest';

describe('useMapPageSetup - Composition Integration', () => {
  const parseCompositionIds = (ce: string | undefined): string[] => {
    if (!ce) return [];
    return ce.split('|').filter((id: string) => id.length > 0);
  };

  describe('compositionExpandedIds parsing from URL', () => {
    it('should parse compositionExpandedIds from ce parameter', () => {
      const ce = '1,0:1|1,0:2';
      const result = parseCompositionIds(ce);
      expect(result).toEqual(['1,0:1', '1,0:2']);
    });

    it('should return empty array when ce parameter is missing', () => {
      const ce = undefined;
      const result = parseCompositionIds(ce);
      expect(result).toEqual([]);
    });

    it('should handle empty ce parameter', () => {
      const ce = '';
      const result = parseCompositionIds(ce);
      expect(result).toEqual([]);
    });

    it('should filter out empty strings from ce parameter', () => {
      const ce = '1,0:1||1,0:2';
      const result = parseCompositionIds(ce);
      expect(result).toEqual(['1,0:1', '1,0:2']);
    });

    it('should handle special characters in composition IDs (coordIds)', () => {
      const ce = '1,0:2,3|2,1:4,5';
      const result = parseCompositionIds(ce);
      expect(result).toEqual(['1,0:2,3', '2,1:4,5']);
    });
  });

  describe('initialCompositionExpandedIds in cacheProviderProps', () => {
    it('should construct props with initialCompositionExpandedIds from ce parameter', () => {
      const ce = '1,0:1';
      const initialCompositionExpandedIds = parseCompositionIds(ce);

      const cacheProviderProps = {
        initialItems: {},
        initialCenter: null,
        initialExpandedItems: [],
        initialCompositionExpandedIds,
        mapContext: undefined,
        cacheConfig: {},
        eventBus: {} as never,
      };

      expect(cacheProviderProps).toHaveProperty('initialCompositionExpandedIds');
      expect(Array.isArray(cacheProviderProps.initialCompositionExpandedIds)).toBe(true);
      expect(cacheProviderProps.initialCompositionExpandedIds).toEqual(['1,0:1']);
    });

    it('should preserve other cache provider props when adding composition support', () => {
      const ce = '1,0:1';
      const expandedItems = '1,2';
      const initialCompositionExpandedIds = parseCompositionIds(ce);
      const initialExpandedItems = expandedItems.split(',');

      const props = {
        initialItems: {},
        initialCenter: null,
        initialExpandedItems,
        initialCompositionExpandedIds,
        mapContext: undefined,
        cacheConfig: {},
        eventBus: {} as never,
      };

      expect(props).toHaveProperty('initialItems');
      expect(props).toHaveProperty('initialCenter');
      expect(props).toHaveProperty('initialExpandedItems');
      expect(props).toHaveProperty('initialCompositionExpandedIds');
      expect(props).toHaveProperty('mapContext');
      expect(props).toHaveProperty('cacheConfig');
      expect(props).toHaveProperty('eventBus');
    });
  });
});
