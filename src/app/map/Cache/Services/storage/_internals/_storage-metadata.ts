/**
 * Storage metadata for version control and debugging
 */
export const CURRENT_STORAGE_VERSION = "1.0.0";

export interface StorageMetadata {
  version: string;
  timestamp: number;
  userAgent?: string;
}

export interface StorageEnvelope<T = unknown> {
  metadata: StorageMetadata;
  data: T;
}

/**
 * Creates metadata for storage operations
 */
export function _createMetadata(): StorageMetadata {
  return {
    version: CURRENT_STORAGE_VERSION,
    timestamp: Date.now(),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  };
}
