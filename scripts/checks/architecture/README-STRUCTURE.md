# README.md Structure Guide

## Purpose
Each subsystem must have a README.md that serves as the single source of truth for understanding that part of the codebase. This replaces the previous dual README/ARCHITECTURE approach.

## Required Structure

Every README.md should follow this template:

```markdown
# [Subsystem Name]

## Mental Model
*How to think about this subsystem - use concrete allegories when possible*
Example: "The Map Cache is the 'database for the frontend' - it stores all tile data locally and syncs with the server like a distributed database would."

## Responsibilities
*What this subsystem IS responsible for - bullet points*
- Specific responsibility 1
- Specific responsibility 2
- Specific responsibility 3

## Non-Responsibilities
*What this subsystem does NOT handle - delegate to the correct subsystem*
*Note: All direct child subsystems should be mentioned here*

- Authentication → See `src/lib/auth/README.md`
- Business logic → See `src/lib/domains/mapping/README.md`
- UI rendering → See `src/app/map/Canvas/README.md`
- [Child subsystem] → See `./child-dir/README.md`

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.
```

## Guidelines

1. **Keep it concise** - Maximum 1 page when possible
2. **Use concrete allegories** - Mental models should use familiar concepts (e.g., "cache as database", "event bus as postal system")
3. **Complete non-responsibilities** - Every child subsystem must be listed in non-responsibilities
4. **Minimal interface exposure** - index.ts should export ONLY what's needed, hiding implementation details
5. **Enforce boundaries** - `pnpm check:architecture` ensures subsystem isolation
6. **Update when architecture changes** - Part of the change process

## Why This Matters

- **Maintainability**: Clear boundaries prevent spaghetti dependencies
- **AI-friendly**: Well-defined interfaces help AI understand what can be used where
- **Minimal surface area**: Less exposed = less to break when refactoring
- **Parent-child freedom**: Children can access parent internals, but siblings must use public APIs

## Migration from ARCHITECTURE.md

When consolidating ARCHITECTURE.md into README.md:
1. Extract a concrete mental model (avoid vague terms like "smart", "manager", "handler")
2. Convert subsystem listing to non-responsibilities section
3. Remove key concepts (they should have their own subsystems)
4. Point dependencies section to dependencies.json only
5. Ensure all child directories are referenced