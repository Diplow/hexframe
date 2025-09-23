# IAM Infrastructure

## Mental Model
Like a library's card catalog system that translates between how patrons ask for books and how the library actually stores and retrieves them from shelves.

## Responsibilities
- Implement repository interfaces using concrete authentication providers (better-auth)
- Translate between domain User entities and external authentication system formats
- Bridge domain business logic with database operations and user ID mapping services
- Handle authentication operations (signup, signin, user lookup) through external auth providers

## Non-Responsibilities
- Business logic and domain rules → See `../services/README.md`
- Domain entity behavior and validation → See `../_objects/README.md`
- Repository interface definitions → See `../_repositories/README.md`
- User-specific infrastructure implementations → See `./user/` (contains BetterAuthUserRepository)

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.