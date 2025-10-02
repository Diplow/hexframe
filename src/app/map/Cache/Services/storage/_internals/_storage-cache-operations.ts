/**
 * Cache-specific storage operations
 * Built on top of generic save/load operations
 */
export function _createCacheOperations(
  save: (key: string, data: unknown) => Promise<void>,
  load: <T = unknown>(key: string) => Promise<T | null>
) {
  const saveCacheData = async (cacheData: unknown): Promise<void> => {
    return save('cache-data', cacheData);
  };

  const loadCacheData = async (): Promise<unknown> => {
    return load('cache-data');
  };

  return {
    saveCacheData,
    loadCacheData,
  };
}
