# Auth Router

## Why This Exists
This subsystem provides tRPC API endpoints for authentication operations. It handles session management and authentication state checks for the Hexframe application.

## Mental Model
The API gateway for authentication operations, providing typed endpoints for auth state management.

## Core Responsibility
This subsystem owns:
- Session retrieval endpoints
- Authentication state checks
- Auth cookie management

This subsystem does NOT own:
- User registration/login (delegated to IAM domain actions)
- Password management (delegated to better-auth)
- Authorization logic (delegated to middleware)

## Public API
See `interface.ts` for the public API. Main capabilities:
- `authRouter` - tRPC router with auth endpoints

## Dependencies
See `dependencies.json` for allowed imports.

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for structure details.