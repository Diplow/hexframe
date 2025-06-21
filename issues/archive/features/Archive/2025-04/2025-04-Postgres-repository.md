# Feature Plan: Postgres Repository Implementation

## 1. Problem Statement

The current in-memory database setup leads to random data loss due to interactions with the Next.js development server. This feature replaces the in-memory persistence layer with a PostgreSQL database for stability and persistence.

## 2. Context

- **Existing DB Setup:** A PostgreSQL database is configured, and schema definitions reside in `src/server/db/schema`. Refer to the `back-db-schema.mdc` rule for schema conventions.
- **Evolved Domain Objects:** The domain objects (`HexMap`, `MapItem`, `BaseItem` aggregates in `src/lib/domains/mapping/_objects`) have been updated since the last database implementation. Refer to `back-domain-objects.mdc` for conventions.
- **Repository Pattern:** The application uses the repository pattern. Interfaces are defined in `src/lib/domains/mapping/_repositories`.
- **Existing Implementations:** In-memory repository implementations exist in `src/lib/domains/mapping/infrastructure`. The `back-infra-memory-repositories.mdc` rule details their structure.
- **Goal:** Implement PostgreSQL versions of `MapRepository`, `MapItemRepository`, and `BaseItemRepository`.

## 3. High-Level Goals

This feature will be implemented in three sequential parts:

1.  **Update DB Schema:** Align the PostgreSQL schema with the current domain object definitions.
2.  **Implement Postgres Repositories:** Create initial PostgreSQL repository implementations for `HexMap`, `MapItem`, and `BaseItem`.
3.  **Implement Generic Postgres Repository:** Refactor the implementations from Part 2 to use a reusable `GenericPostgresRepository`.

## 4. Detailed Implementation Steps

### Part 1: Update DB Schema

- **Step 1.1: Analyze Domain Objects:** Review the structure of `HexMap`, `MapItem`, and `BaseItem` aggregates located in `src/lib/domains/mapping/_objects`. Identify all properties, relationships (`RelatedList`, `RelatedItem`), identifiers, and attributes.
- **Step 1.2: Create DB Mapping Rule:**
  - Create a new rule file named `back-db-postgres.mdc`.
  - **Action:** Document the mapping strategy from domain aggregates to PostgreSQL tables within this rule. Key principles to include:
    - One table per aggregate.
    - `RelatedList` properties map to many-to-many relationship tables.
    - `RelatedItem` properties map to foreign key columns in the aggregate's table.
    - Identifier properties should have database indexes.
    - Attribute properties map to table columns with appropriate types.
    - ID types should be integers.
    - All tables must include `createdAt` and `updatedAt` timestamp columns.
  - Consider referencing `back-domain-objects.mdc` for detailed domain object conventions if needed.
- **Step 1.3: Update Schema Files:**
  - **Action:** Modify the Drizzle schema files within `src/server/db/schema`.
  - Apply the changes needed to reflect the current structure of `HexMap`, `MapItem`, and `BaseItem` aggregates, following the mapping strategy defined in `back-db-postgres.mdc` (Step 1.2).

### Part 2: Implement Postgres Repositories & Testing

- **Step 2.1: Create Repository Rule:**
  - **Action:** Create a new rule file named `back-postgres-repositories.mdc`.
  - **Action:** Define the initial implementation principles for the PostgreSQL repositories in this rule.
  - **Constraint:** Specify that this first implementation _must not_ depend on a `GenericRepository`.
  - **Guidance:** Emphasize using the Drizzle ORM and the schema updated in Part 1.
- **Step 2.2: Implement `HexMapRepository`:**
  - **Action:** Create the file `src/lib/domains/mapping/infrastructure/hex-map/db.ts`.
  - **Action:** Implement the `DbHexMapRepository` class, ensuring it adheres to the `HexMapRepository` interface (`src/lib/domains/mapping/_repositories/hex-map.ts`).
  - Follow the principles defined in `back-postgres-repositories.mdc` (Step 2.1).
- **Step 2.3: Implement `MapItemRepository`:**
  - **Action:** Create the file `src/lib/domains/mapping/infrastructure/map-item/db.ts`.
  - **Action:** Implement the `DbMapItemRepository` class, ensuring it adheres to the `MapItemRepository` interface (`src/lib/domains/mapping/_repositories/map-item.ts`).
  - Follow the principles defined in `back-postgres-repositories.mdc` (Step 2.1).
- **Step 2.4: Implement `BaseItemRepository`:**
  - **Action:** Create the file `src/lib/domains/mapping/infrastructure/base-item/db.ts`.
  - **Action:** Implement the `DbBaseItemRepository` class, ensuring it adheres to the `BaseItemRepository` interface (`src/lib/domains/mapping/_repositories/base-item.ts`).
  - Follow the principles defined in `back-postgres-repositories.mdc` (Step 2.1).
- **Step 2.5: Prepare Test Environment:**
  - **Action:** Run the existing test suite located at `src/lib/domains/mapping/services/__tests__/hex-map.test.ts` (which likely uses the memory repository).
  - **Goal:** Confirm the existing tests pass before modification.
- **Step 2.6: Abstract Test Setup:**
  - **Action:** Refactor the test setup within `src/lib/domains/mapping/services/__tests__/hex-map.test.ts`.
  - **Goal:** Modify the test suite so it can be initialized with _any_ implementation conforming to the `HexMapRepository` interface (allowing it to run against both memory and Postgres implementations). This likely involves parameterizing the repository instantiation.
- **Step 2.7: Create Integration Test File:**
  - **Action:** Duplicate the test file `src/lib/domains/mapping/services/__tests__/hex-map.test.ts`.
  - **Action:** Rename the new file to `src/lib/domains/mapping/services/__tests__/hex-map.integration.test.ts`.
  - **Action:** Configure this new integration test file to instantiate and use the `DbHexMapRepository` (from Step 2.2) for its tests.
- **Step 2.8: Run and Verify Tests:**
  - **Action:** Execute both test suites:
    - The original `hex-map.test.ts` (now configured to use the memory repository via the abstracted setup).
    - The new `hex-map.integration.test.ts` (configured to use the Postgres repository).
  - **Goal:** Ensure all tests pass for _both_ repository implementations. Debug and fix repository implementations (Steps 2.2-2.4) or test setup (Step 2.6-2.7) as needed.

### Part 3: Implement Generic Postgres Repository

- **Step 3.1: Implement `GenericPostgresRepository`:**
  - **Action:** Create the file `src/lib/infrastructure/common/generic-repositories/postgres.ts`.
  - **Action:** Implement a generic base class (`GenericPostgresRepository`).
  - **Guidance:** Design it to handle common CRUD operations using Drizzle. Pay close attention to typing to make it easily extensible. Use `src/lib/infrastructure/common/generic-repositories/memory.ts` for inspiration regarding structure and patterns.
- **Step 3.2: Refactor `HexMapRepository`:**
  - **Action:** Modify `src/lib/domains/mapping/infrastructure/hex-map/db.ts`.
  - Update `DbHexMapRepository` to extend `GenericPostgresRepository`.
  - Remove duplicated code now handled by the generic base class. Retain or implement only logic specific to `HexMap`.
- **Step 3.3: Refactor `MapItemRepository`:**
  - **Action:** Modify `src/lib/domains/mapping/infrastructure/map-item/db.ts`.
  - Update `DbMapItemRepository` to extend `GenericPostgresRepository`.
  - Remove duplicated code. Retain or implement only logic specific to `MapItem`.
- **Step 3.4: Refactor `BaseItemRepository`:**
  - **Action:** Modify `src/lib/domains/mapping/infrastructure/base-item/db.ts`.
  - Update `DbBaseItemRepository` to extend `GenericPostgresRepository`.
  - Remove duplicated code. Retain or implement only logic specific to `BaseItem`.
- **Step 3.5: Run and Verify Tests:**
  - **Action:** Execute the integration test suite (`hex-map.integration.test.ts` and potentially similar ones for MapItem/BaseItem if created during testing).
  - **Goal:** Ensure all tests still pass after refactoring to use the generic repository. Debug the generic repository (Step 3.1) or specific implementations (Steps 3.2-3.4) if tests fail.
- **Step 3.6: Update Repository Rule:**
  - **Action:** Modify the `back-postgres-repositories.mdc` rule (created in Step 2.1).
  - **Action:** Update the principles to mandate that all future aggregate-specific PostgreSQL repositories _must_ extend the `GenericPostgresRepository`.

## 5. Potential Areas for More Detail (Self-Correction/Refinement)

When executing the plan, the AI should consider if more detail is needed in these areas:

- **Schema Mapping Specifics (Step 1.2):** If the mapping for `RelatedList` (m2m tables) or `RelatedItem` (FKs) isn't obvious, request clarification or propose a specific structure within the `back-db-postgres.mdc` rule.
- **Drizzle Usage Patterns (Step 2.1):** If standard patterns for transactions, relation handling, or specific query types aren't clear, define them in the `back-postgres-repositories.mdc` rule.
- **Generic Repository Design (Step 3.1):** The exact methods (abstract vs. concrete) and handling of aggregate-specific queries within `GenericPostgresRepository` might require refinement during implementation. Ensure the design chosen is documented or clearly derivable.

# Learnings

- Should have done a single prompt for each part
- The database schema had some key missunderstandings:
  - a useless table hex_map_map_items (it applied the rule relatedList = many2many literally)
  - a useless table neighbors
  - stored coordinates in json format
- did not implement adapters the right way (custom functions inside the db repository)
- I did not anticipate the key differences between in memory and db (cascading delete, cascade creation...)
