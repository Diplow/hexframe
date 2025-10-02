# Chat Input

## Mental Model
Like a smart terminal interface that transforms user text into structured commands and messages for the chat system.

## Responsibilities
- Process user text input with real-time validation and command detection
- Provide intelligent command autocomplete with keyboard navigation
- Maintain input history with up/down arrow navigation
- Handle textarea controls including auto-resize and focus management
- Parse and execute slash commands (navigation, debug, auth, MCP, settings)

## Non-Responsibilities
- Command execution logic → See `../_state/README.md` for chat state management
- Message display and rendering → See `../Timeline/README.md` for message display
- Widget lifecycle management → See `../Timeline/Widgets/README.md` for widget handling
- Command definitions implementation → See `./_commands/` internal modules
- UI component primitives → See `./_components/` internal modules
- Specialized hook logic → See `./_hooks/` internal modules
- Input processing services → See `./_services/` internal modules

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.