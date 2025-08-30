import { db } from "~/server/db";
import type { DatabaseConnection, DatabaseTransaction } from "~/lib/domains/mapping/types/transaction";

/**
 * Manages database transactions for mapping domain operations
 */
export class TransactionManager {
  /**
   * Execute a function within a database transaction
   * All database operations within the function will be atomic
   */
  static async runInTransaction<T>(
    fn: (tx: DatabaseTransaction) => Promise<T>
  ): Promise<T> {
    return await db.transaction(async (tx) => {
      return await fn(tx);
    });
  }

  /**
   * Get the appropriate database connection (transaction or main db)
   * This allows repository methods to work with or without transactions
   */
  static getConnection(tx?: DatabaseConnection): DatabaseConnection {
    return tx ?? db;
  }
}