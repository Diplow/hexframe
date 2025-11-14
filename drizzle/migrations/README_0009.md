# Migration 0009: Composition to Negative Directions

## Overview

This migration transforms the composition system from using direction-0 containers to negative direction values:

**Old Model:** `parent → 0 → 1,2,3,4,5,6` (container with structural children)
**New Model:** `parent → -1,-2,-3,-4,-5,-6` (composed children directly)

## Direction Mapping

| Structural Direction | Composed Direction | Description |
|---------------------|-------------------|-------------|
| 1 (NorthWest)       | -1 (ComposedNorthWest) | Composition in NW |
| 2 (NorthEast)       | -2 (ComposedNorthEast) | Composition in NE |
| 3 (East)            | -3 (ComposedEast)      | Composition in E  |
| 4 (SouthEast)       | -4 (ComposedSouthEast) | Composition in SE |
| 5 (SouthWest)       | -5 (ComposedSouthWest) | Composition in SW |
| 6 (West)            | -6 (ComposedWest)      | Composition in W  |

## Content Preservation Logic

The migration **preserves containers with meaningful content** to prevent data loss.

### What is "Meaningful Content"?

A container is considered to have meaningful content if it has a `base_item` with:

1. **Non-placeholder content** - Content field not in: `['Container Content', 'Content', 'Composition Container']`
2. **Custom title** - Title not in: `['Container', 'Composition Container', 'Empty Container', 'Root Container']`
3. **Preview text** - Non-empty `preview` field
4. **Link** - Non-empty `link` field

### Decision Matrix

| Has Content | Has Children | Action |
|------------|--------------|---------|
| ✅ Yes      | ❌ No        | **Preserve** - Keep as direction-0 node (orchestration instructions with no children) |
| ✅ Yes      | ✅ Yes       | **Preserve** - Keep container, migrate children (orchestration + composition) |
| ❌ No       | ✅ Yes       | **Delete** - Remove container, migrate children to negative directions |
| ❌ No       | ❌ No        | **Delete** - Remove empty placeholder container |

## Examples

### Example 1: Empty Container (DELETED)

**Before:**
```
1 → 0 → 1
```
- Container at `1,0` has title="Container", content="Content"
- Child at `1,0,1` has actual content

**After:**
```
1 → -1
```
- Container deleted (placeholder only)
- Child migrated to `1,-1` (negative direction)

### Example 2: Container with Content (PRESERVED)

**Before:**
```
1 → 0 → 1
```
- Container at `1,0` has title="Orchestration", content="Use these tools in sequence..."
- Child at `1,0,1` has tool content

**After:**
```
1 → 0
    → -1
```
- Container preserved at `1,0` (has orchestration instructions)
- Child migrated to `1,-1` (negative direction)
- Both nodes remain accessible

## Orphaned Base Items

When a container is deleted, its `base_item` is also cleaned up **if and only if**:
1. The container has no meaningful content
2. The base_item is not referenced by any other map_item

This prevents orphaned records in the `vde_base_items` table.

## Idempotency

The migration is safe to run multiple times:
- Only processes containers at direction 0 (`path LIKE '%,0' OR path = '0'`)
- Skips already-migrated negative direction items
- Preserves structural children (directions 1-6 without preceding 0)
- Uses depth-first processing (deepest first) to avoid conflicts

## Testing

See `drizzle/__tests__/migration-composition-negative-directions.integration.test.ts` for comprehensive test coverage:

- ✅ Database schema supports negative integers in path column
- ✅ Simple compositions (single child, all 6 directions)
- ✅ Edge cases (empty containers, root-level, deep nesting, multiple compositions)
- ✅ Content preservation (meaningful content, placeholder content, links)
- ✅ Idempotency (safe to run multiple times)
- ✅ Data integrity (grandchildren, timestamps, references preserved)
- ✅ Orphaned base_item cleanup

## Running the Migration

This is a **one-time migration script**, not a schema change. To run it manually:

```bash
# Connect to your database
psql $DATABASE_URL

# Run the migration file
\i drizzle/migrations/0009_migrate_composition_negative_directions.sql
```

Or via Drizzle:

```typescript
import { sql } from "drizzle-orm";
import { db } from "~/server/db";

// Read and execute the migration file
await db.execute(sql.raw(migrationFileContents));
```

## Rollback

**⚠️ WARNING: There is no automated rollback for this migration.**

If you need to rollback:
1. Restore from database backup taken before migration
2. Or manually reconstruct direction-0 containers (not recommended)

## Migration Checklist

Before running:
- [ ] **Backup your database**
- [ ] Review containers with meaningful content
- [ ] Verify no custom code depends on direction-0 paths
- [ ] Test on a staging environment first

After running:
- [ ] Verify container counts match expectations
- [ ] Check that meaningful content was preserved
- [ ] Confirm composed children are at negative directions
- [ ] Test frontend composition toggle functionality
- [ ] Monitor for orphaned base_items (should be none)

## Related Files

- Migration SQL: `0009_migrate_composition_negative_directions.sql`
- Integration Tests: `drizzle/__tests__/migration-composition-negative-directions.integration.test.ts`
- Domain README: `src/lib/domains/mapping/README.md`
- Ubiquitous Language: `UBIQUITOUS.md`