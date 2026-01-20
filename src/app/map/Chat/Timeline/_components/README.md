# _components

## Mental Model
Like the building blocks of a conversation display - provides reusable UI components for rendering individual chat elements (messages, timestamps, markdown content, copy buttons) that are assembled together to create the full chat timeline experience.

## Responsibilities
- Render individual message content with actor attribution (user, assistant, system)
- Display formatted timestamps and day separators for chronological context
- Parse and render markdown content with interactive code blocks
- Provide copy functionality for message content
- Render embedded tool calls within assistant messages
- Coordinate with widgets for complex interactive elements

## Non-Responsibilities
- Widget implementations → See `../Widgets/README.md`
- Chat state management → See `../../_state/README.md`
- Event bus communication → See `~/app/map/Services/README.md`
- Authentication logic → See `~/lib/auth/README.md`
- Renderers for specific widget types → See `./_renderers/`
- Hooks for state coordination → See `./_hooks/`

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.
