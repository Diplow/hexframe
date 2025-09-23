# Authentication Client

## Mental Model
Like a diplomatic passport office - provides standardized credentials and handles all entry/exit protocols for accessing the application.

## Responsibilities
- Configure and expose the better-auth client for frontend authentication
- Handle HTTP communication with the authentication server at `/api/auth`
- Provide logging and debugging for authentication requests
- Export type-safe authentication types (Session, User) for the application
- Manage environment-specific authentication URLs (local, Vercel, custom)

## Non-Responsibilities
- Server-side authentication logic → See `~/server/auth.ts`
- User interface components → See `~/app/map/Chat/Widgets/LoginWidget.tsx`
- Authentication API routes → See `~/app/api/auth/[...all]/route.ts`
- User session management in tRPC → See `~/server/api/trpc.ts`
- Identity and Access Management domain logic → See `~/lib/domains/iam/README.md`

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.