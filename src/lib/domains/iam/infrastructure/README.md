# IAM Infrastructure

## Why This Exists
This subsystem provides concrete implementations of repository interfaces, bridging the gap between the IAM domain's business logic and external authentication systems (like better-auth) and data persistence layers.

## Mental Model
Infrastructure adapters that translate between domain models and external systems.

## Core Responsibility
This subsystem owns:
- Repository implementations for user data access
- Integration with authentication providers (better-auth)
- Translation between domain entities and external data formats

This subsystem does NOT own:
- Business logic (delegated to services)
- Domain entity behavior (delegated to objects)
- Repository interfaces (owned by _repositories)

## Public API
See `interface.ts` for the public API. Main capabilities:
- `BetterAuthUserRepository` - Repository implementation using better-auth

## Dependencies
See `dependencies.json` for allowed imports.

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for structure details.