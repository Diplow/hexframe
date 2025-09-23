# Auth Router

## Mental Model
Like a security checkpoint at a building entrance - validates credentials and manages access tokens for authenticated operations.

## Responsibilities
- Provides tRPC endpoints for authentication operations (login, logout, session retrieval)
- Manages authentication session state through better-auth integration
- Handles auth cookie management and forwarding
- Validates user credentials and returns session data

## Non-Responsibilities
- User registration implementation → Delegated to client-side better-auth
- Password storage and hashing → Handled by better-auth
- Authorization policies → Handled by tRPC middleware
- User profile management → See `../user/README.md`

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.