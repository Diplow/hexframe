# Database Schema

## Mental Model
The schema layer is like a "blueprint architect" that defines the structure of all database tables using Drizzle ORM - it translates TypeScript type definitions into SQL tables with proper constraints, indexes, and relationships.

## Responsibilities
- Define PostgreSQL table structures using Drizzle ORM syntax
- Configure table relationships (foreign keys, cascading deletes)
- Specify indexes for query performance optimization
- Define table prefixes (vde_) to avoid naming conflicts
- Export table definitions and relations for use by repositories
- Ensure referential integrity through foreign key constraints

## Non-Responsibilities
- Database queries and mutations → See `~/lib/domains/mapping/infrastructure/README.md`
- Business logic and validation → See `~/lib/domains/mapping/README.md`
- API endpoints → See `~/server/api/README.md`
- Migration generation and application → See `drizzle/migrations/README.md`
- Auth table definitions → See `./_tables/auth/README.md`
- Mapping table definitions → See `./_tables/mapping/README.md`
- LLM job results → See `./_tables/llm-job-results.ts`

## Interface
**Exports**: See `index.ts` for all table definitions and relations:
- `baseItems`: Core content storage table
- `baseItemVersions`: Version history for baseItems (snapshots of content changes)
- `mapItems`: Hexagonal coordinate references to baseItems
  - **Path column**: varchar(255) storing comma-separated integers (positive, zero, and negative)
  - Supports structural children (1-6), composition (0), and composed children (-1 to -6)
  - Examples: "1,2,3" (structural), "1,0,-3" (composition + composed), "1,-3,2" (mixed)
  - See inline documentation in `_tables/mapping/map-items.ts` for full path format details
- `baseItemRelations`: Drizzle relations for baseItems (includes versions)
- `baseItemVersionsRelations`: Drizzle relations for version history
- Auth tables: users, accounts, sessions, verificationTokens, apiKeys
- User mapping tables

**Table Prefix**: All tables use the `vde_` prefix via the `createTable()` helper from `_utils.ts`.

**Dependencies**: No dependencies.json needed - schema layer only imports from Drizzle ORM and internal table files.

**Migration Workflow**:
1. Define/modify tables in `_tables/` directory
2. Run `pnpm db:generate` to create migration SQL
3. Review generated migration in `drizzle/migrations/`
4. Run `pnpm db:migrate` to apply to database

**Note**: Child subsystems (_tables/) are implementation details. Other subsystems should import from repositories, not directly from schema.
