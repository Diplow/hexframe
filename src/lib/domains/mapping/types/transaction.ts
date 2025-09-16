import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { schema } from "~/server/db";

/**
 * Transaction type for database operations
 * This allows repository methods to participate in transactions
 */
export type DatabaseTransaction = PostgresJsDatabase<typeof schema>;

/**
 * Database connection type that can be either a transaction or the main database
 */
export type DatabaseConnection = PostgresJsDatabase<typeof schema> | DatabaseTransaction;

/**
 * Options that can be passed to repository methods
 * Includes optional transaction for atomic operations
 */
export interface RepositoryOptions {
  tx?: DatabaseTransaction;
}