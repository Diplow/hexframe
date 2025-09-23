# LoginWidget

## Mental Model
Like a secure entrance booth at a building - provides a controlled gateway where visitors can identify themselves (login) or register for access, with clear feedback about the authentication process.

## Responsibilities
- Renders authentication forms with real-time validation
- Manages switching between login and registration modes
- Handles form submission to auth client with error handling
- Provides status feedback (errors, success messages, loading states)
- Integrates with event bus to emit authentication events

## Non-Responsibilities
- Authentication business logic → See `~/lib/auth/README.md`
- Session management and persistence → See `~/lib/auth/README.md`
- Navigation routing after successful auth → Handled by parent components
- Widget layout and shared UI patterns → See `../README.md`

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.