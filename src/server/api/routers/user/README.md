# User Router

## Why This Exists
This subsystem provides tRPC API endpoints for user profile and account management. It handles user registration, profile updates, and user-specific operations.

## Mental Model
The API gateway for user account operations, bridging frontend requests with the IAM domain.

## Core Responsibility
This subsystem owns:
- User registration endpoint
- Profile retrieval and updates
- User settings management

This subsystem does NOT own:
- Authentication (delegated to auth router)
- Session management (delegated to better-auth)
- User data persistence (delegated to IAM domain)

## Public API
See `interface.ts` for the public API. Main capabilities:
- `userRouter` - tRPC router with user management endpoints

## Dependencies
See `dependencies.json` for allowed imports.

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for structure details.