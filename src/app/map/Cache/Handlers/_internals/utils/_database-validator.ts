import { loggers } from "~/lib/debug/debug-logger";

/**
 * Validate and parse database ID from identifier
 */
export function validateDatabaseId(itemIdentifier: string): number | null {
  if (itemIdentifier.includes(',') || itemIdentifier.includes(':')) {
    loggers.mapCache.handlers('[Navigation] Cannot load by coordinate ID from server');
    return null;
  }

  const dbIdNumber = parseInt(itemIdentifier);
  if (isNaN(dbIdNumber)) {
    return null;
  }

  return dbIdNumber;
}
