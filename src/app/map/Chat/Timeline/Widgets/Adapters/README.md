# Adapters

## Mental Model
Like a translation layer - takes Widget state objects from Chat state and adapts them into the appropriate Widget UI components for display.

## Responsibilities
- Adapt Widget state objects into Widget UI components
- Handle different widget types (tile, login, error, loading, etc.)
- Pass through handlers and data to the underlying widgets

## Non-Responsibilities
- Widget implementations -> See `../README.md` (parent Widgets)
- Widget state management -> See `../../../_state/README.md`

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.
