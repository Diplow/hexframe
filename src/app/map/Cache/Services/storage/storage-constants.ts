// Storage key utilities
export const STORAGE_KEYS = {
  CACHE_DATA: "mapCache:data",
  CACHE_METADATA: "mapCache:metadata",
  USER_PREFERENCES: "mapCache:preferences",
  EXPANDED_ITEMS: "mapCache:expandedItems",
} as const;

// Storage configuration constants
export const STORAGE_CONFIG = {
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
  MAX_CACHE_SIZE: 1000,
  COMPRESSION_THRESHOLD: 1024, // bytes
} as const;