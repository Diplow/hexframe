import type { MapItemAPIContract } from "~/server/api";

export type OptimisticChangeType = 'create' | 'update' | 'delete';

export interface OptimisticChange {
  type: OptimisticChangeType;
  coordId: string;
  previousData?: MapItemAPIContract;
  rawData?: MapItemAPIContract;
  metadata?: {
    optimisticCoordIds?: string[];
    previousChildrenData?: MapItemAPIContract[];
  };
}

export interface TrackedChange extends OptimisticChange {
  id: string;
  timestamp: number;
}

/**
 * Manages optimistic updates and their rollbacks
 * Tracks pending changes and maintains rollback data
 */
export class OptimisticChangeTracker {
  private changes = new Map<string, OptimisticChange>();

  generateChangeId(): string {
    return `opt_${Date.now()}_${Math.random()}`;
  }

  trackChange(changeId: string, change: OptimisticChange): void {
    this.changes.set(changeId, change);
  }

  getChange(changeId: string): OptimisticChange | undefined {
    return this.changes.get(changeId);
  }

  removeChange(changeId: string): void {
    this.changes.delete(changeId);
  }

  getAllChanges(): TrackedChange[] {
    return Array.from(this.changes.entries()).map(([id, change]) => ({
      id,
      ...change,
      timestamp: parseInt(id.split('_')[1] ?? '0'),
    }));
  }

  clear(): void {
    this.changes.clear();
  }
}