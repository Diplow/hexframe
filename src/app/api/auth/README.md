# Auth API Route

## Why This Exists
This subsystem provides the Next.js API route handler for better-auth authentication endpoints. It exposes the auth system's HTTP endpoints for login, logout, session management, and OAuth flows.

## Mental Model
The HTTP gateway that bridges better-auth with Next.js App Router API routes.

## Core Responsibility
This subsystem owns:
- HTTP route handling for all auth endpoints
- Request/response translation for better-auth
- Cookie and session management

This subsystem does NOT own:
- Authentication logic (delegated to better-auth)
- User data persistence (delegated to IAM domain)
- Frontend auth UI (delegated to auth pages)

## Public API
This is an API route handler - no TypeScript interface needed.

## Dependencies
See `dependencies.json` for allowed imports.

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for structure details.