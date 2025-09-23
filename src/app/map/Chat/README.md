# Chat

## Mental Model
Like a mission control center for a space station - coordinates all communication between the user and the hexagonal map system, displaying real-time events and providing a conversational interface for issuing commands.

## Responsibilities
- Provide main chat panel interface with header, timeline, and input areas
- Coordinate authentication state changes and user session management
- Integrate AI-powered chat capabilities with loading states and response handling
- Emit and respond to system-wide events through the EventBus
- Manage overall chat layout and component composition

## Non-Responsibilities
- Text input processing and command parsing → See `./Input/README.md`
- Message and widget timeline display → See `./Timeline/README.md`
- Event-driven state management and data persistence → See `./_state/` internal module
- Chat configuration and user preferences → See `./_settings/` internal module
- Authentication logic implementation → See `~/lib/auth` domain
- Widget-specific rendering and behavior → See `./Timeline/Widgets/` subsystems

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.