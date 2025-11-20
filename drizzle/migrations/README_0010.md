# Migration 0010: Convert User IDs from Integer to Text

## Overview

This migration eliminates the `UserMappingService` and `user_mapping` table by converting the mapping system to use better-auth's native string user IDs directly.

## Problem Statement

Previously, the system maintained two separate ID systems:
- **better-auth IDs**: String UUIDs (e.g., "550e8400-e29b-41d4-a716-446655440000")
- **mapping IDs**: Integer IDs (1, 2, 3, ...) stored in a separate `user_mapping` table

This required constant translation between ID formats, creating:
- Cognitive overhead for developers and AI
- Additional database lookups
- Unnecessary complexity in the codebase

## Solution

Convert `map_items.coord_user_id` from `integer` to `text`, using better-auth's string IDs directly. This eliminates the need for the `user_mapping` table entirely.

## Migration Steps

1. **Add temporary column**: Create `coord_user_id_text` as text
2. **Backfill data**: Copy auth user IDs from `user_mapping` table
3. **Validate**: Ensure all rows have been migrated
4. **Swap columns**: Drop old integer column, rename text column
5. **Recreate indexes**: Update indexes to use new text column
6. **Clean up**: Drop `user_mapping` table

## Impact

### Database Changes
- ✅ `vde_map_items.coord_user_id`: `integer` → `text`
- ❌ `vde_user_mapping`: Entire table removed

### Performance Considerations
- String comparisons are slightly slower than integer comparisons
- With proper indexes (already in place), performance impact is negligible
- UUIDs use more storage (36 bytes vs 4 bytes), but coordinate columns are indexed, not stored in large quantities per row

### Rollback Plan

If rollback is needed before dropping `user_mapping`:
```sql
-- Rollback steps (before Step 8 in migration)
ALTER TABLE "vde_map_items" RENAME COLUMN "coord_user_id" TO "coord_user_id_text";
ALTER TABLE "vde_map_items" ADD COLUMN "coord_user_id" integer;
UPDATE "vde_map_items"
SET "coord_user_id" = (
  SELECT "mapping_user_id"
  FROM "vde_user_mapping"
  WHERE "auth_user_id" = "vde_map_items"."coord_user_id_text"
);
ALTER TABLE "vde_map_items" ALTER COLUMN "coord_user_id" SET NOT NULL;
DROP COLUMN "coord_user_id_text";
-- Recreate original indexes
```

## Verification

After migration, verify:
1. All map items have valid text user IDs
2. User IDs match existing users in the `users` table
3. No orphaned map items

```sql
-- Check for invalid user IDs
SELECT COUNT(*) FROM vde_map_items m
LEFT JOIN users u ON m.coord_user_id = u.id
WHERE u.id IS NULL;
-- Should return 0
```

## Code Changes Required

This is a **breaking change** that requires coordinated code updates:
- Type definitions: `Coord.userId: number` → `Coord.userId: string`
- Remove `UserMappingService` class
- Update all repositories, services, and API handlers
- Update client-side types and caching layer

See the main PR for the complete code migration.
