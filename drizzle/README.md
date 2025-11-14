# Database Migrations

## Mental Model
The migrations directory is like a "version control system for the database schema" - each migration file is a commit that transforms the database structure forward (or backward for rollbacks), ensuring all environments stay in sync with the codebase evolution.

## Responsibilities
- Define incremental database schema changes as SQL migration files
- Transform existing data structures to match new schema requirements (data migrations)
- Ensure idempotent migrations that can safely run multiple times
- Verify PostgreSQL schema compatibility with application requirements
- Preserve data integrity across schema transformations
- Document migration rationale and transformation logic
- Provide comprehensive integration tests for migration correctness

## Non-Responsibilities
- Database connection management → See `~/server/db/index.ts`
- Schema definitions (Drizzle ORM models) → See `~/server/db/schema.ts`
- Application domain logic → See `~/lib/domains/README.md`
- Test utilities and helpers → See `./__tests__/` for test-specific helpers only

## Interface

This directory contains SQL migration files processed by Drizzle ORM's migration system. Migrations are numbered sequentially and executed in order.

### Migration Files
- `migrations/00XX_*.sql` - SQL migration scripts executed by Drizzle
- `migrations/meta/` - Drizzle migration metadata (auto-generated)

### Integration Tests
- `__tests__/*.integration.test.ts` - Integration tests verifying migration correctness

### Latest Migration
**0009_migrate_composition_negative_directions.sql** - Transforms existing composition containers (direction 0) to negative direction format:
- Old model: parent → 0 → 1,2,3,4,5,6 (container with structural children)
- New model: parent → -1,-2,-3,-4,-5,-6 (composed children directly)
- Idempotent, handles edge cases (empty compositions, deep nesting, root level)
- Preserves data integrity (relationships, references, timestamps)

### Running Migrations
```bash
# Generate new migration (after schema changes)
pnpm db:push

# Apply migrations to database
# (Automatically run via Drizzle migration system)
```

**Note**: Drizzle manages migration execution automatically. This directory is primarily for storing migration files and verifying their correctness through integration tests.
