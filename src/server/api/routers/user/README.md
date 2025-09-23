# User Router

## Mental Model
Like a hotel concierge that orchestrates different services to fulfill guest requests - coordinates IAM domain, Mapping domain, and better-auth to handle user operations.

## Responsibilities
- Cross-domain user registration workflow (creating user + optional default map + auto-login)
- User login orchestration (credential validation via IAM + session creation via better-auth)
- User profile management operations (retrieve, update current user profile)
- User lookup operations (by ID, email, or mapping ID)
- Session cookie forwarding for seamless authentication flow

## Non-Responsibilities
- User data persistence → See `~/lib/domains/iam/README.md`
- Session management and authentication tokens → Delegated to better-auth
- Map creation logic → See `~/lib/domains/mapping/README.md`
- Input validation schemas → Handled locally with zod

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.