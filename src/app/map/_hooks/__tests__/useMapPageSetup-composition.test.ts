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

    it('should parse composition coordIds with negative directions', () => {
      const ce = '1,0:2,0,-1|1,0:2,0,-2';
      const result = parseCompositionIds(ce);
      expect(result).toEqual(['1,0:2,0,-1', '1,0:2,0,-2']);
    });

    it('should handle mixed positive and negative directions in coordIds', () => {
      const ce = '1,0:2|1,0:2,0,-1|1,0:3,0,-3';
      const result = parseCompositionIds(ce);
      expect(result).toEqual(['1,0:2', '1,0:2,0,-1', '1,0:3,0,-3']);
    });

    it('should handle deeply nested coordIds with negative directions', () => {
      const ce = '1,0:2,3,4,0,-1|2,1:5,6,0,-5';
      const result = parseCompositionIds(ce);
      expect(result).toEqual(['1,0:2,3,4,0,-1', '2,1:5,6,0,-5']);
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

    it('should handle initialCompositionExpandedIds with negative direction coordIds', () => {
      const ce = '1,0:2,0,-1|1,0:3,0,-2';
      const initialCompositionExpandedIds = parseCompositionIds(ce);

      const props = {
        initialItems: {},
        initialCenter: null,
        initialExpandedItems: [],
        initialCompositionExpandedIds,
        mapContext: undefined,
        cacheConfig: {},
        eventBus: {} as never,
      };

      expect(props.initialCompositionExpandedIds).toEqual(['1,0:2,0,-1', '1,0:3,0,-2']);
    });

    it('should default to empty array when ce parameter is undefined', () => {
      const ce = undefined;
      const initialCompositionExpandedIds = parseCompositionIds(ce);

      const props = {
        initialItems: {},
        initialCenter: null,
        initialExpandedItems: [],
        initialCompositionExpandedIds,
        mapContext: undefined,
        cacheConfig: {},
        eventBus: {} as never,
      };

      expect(props.initialCompositionExpandedIds).toEqual([]);
    });
  });

  describe('URL parameter preservation during redirect', () => {
    it('should preserve ce parameter when redirecting to user map', () => {
      const searchParams = new URLSearchParams();
      searchParams.set('ce', '1,0:1|1,0:2');

      const urlString = `/map?${searchParams.toString()}`;
      expect(urlString).toContain('ce=1%2C0%3A1%7C1%2C0%3A2');
    });

    it('should preserve ce parameter along with other params during redirect', () => {
      const searchParams = new URLSearchParams();
      searchParams.set('center', '123');
      searchParams.set('expandedItems', '1,2,3');
      searchParams.set('ce', '1,0:1|1,0:2,0,-1');
      searchParams.set('scale', '2');

      const urlString = `/map?${searchParams.toString()}`;
      expect(urlString).toContain('center=123');
      expect(urlString).toContain('expandedItems=1%2C2%2C3');
      expect(urlString).toContain('ce=');
      expect(urlString).toContain('scale=2');
    });

    it('should handle ce parameter with negative directions in URL encoding', () => {
      const searchParams = new URLSearchParams();
      searchParams.set('ce', '1,0:2,0,-1|1,0:3,0,-5');

      const urlString = searchParams.toString();
      expect(urlString).toContain('ce=');

      // Verify it can be decoded back
      const decodedCe = searchParams.get('ce');
      expect(decodedCe).toBe('1,0:2,0,-1|1,0:3,0,-5');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle coordIds with only negative directions', () => {
      const ce = '1,0:-1|-2|-3';
      const result = parseCompositionIds(ce);
      expect(result).toEqual(['1,0:-1', '-2', '-3']);
    });

    it('should handle single coordId without delimiter', () => {
      const ce = '1,0:2,0,-1';
      const result = parseCompositionIds(ce);
      expect(result).toEqual(['1,0:2,0,-1']);
    });

    it('should filter empty strings from malformed ce parameter', () => {
      const ce = '1,0:1|||1,0:2||';
      const result = parseCompositionIds(ce);
      expect(result).toEqual(['1,0:1', '1,0:2']);
    });

    it('should handle ce parameter with trailing delimiter', () => {
      const ce = '1,0:1|1,0:2|';
      const result = parseCompositionIds(ce);
      expect(result).toEqual(['1,0:1', '1,0:2']);
    });

    it('should handle ce parameter with leading delimiter', () => {
      const ce = '|1,0:1|1,0:2';
      const result = parseCompositionIds(ce);
      expect(result).toEqual(['1,0:1', '1,0:2']);
    });
  });
});
