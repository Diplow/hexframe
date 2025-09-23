# Auth API Route

## Mental Model
Like a hotel reception desk that receives all guest authentication requests and forwards them to the appropriate authentication service behind the scenes.

## Responsibilities
- Handle HTTP requests to all authentication endpoints via catch-all route
- Delegate authentication logic to better-auth handler
- Expose better-auth endpoints as Next.js API routes
- Manage HTTP method routing (GET, POST) for auth operations

## Non-Responsibilities
- Authentication business logic → See `~/server/auth`
- User data persistence → See `~/lib/domains/iam`
- Frontend authentication UI → See `~/app/auth` pages
- Session storage implementation → Handled by better-auth

## Interface
*See `dependencies.json` for what this subsystem can import*

Note: This is a Next.js API route handler, not a TypeScript module with exports. It provides HTTP endpoints at `/api/auth/*` that frontend components and OAuth providers can call. The CI tool `pnpm check:architecture` enforces dependency boundaries.