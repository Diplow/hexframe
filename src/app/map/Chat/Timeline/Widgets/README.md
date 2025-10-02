# Widgets

## Mental Model
Like a digital toolbox for specialized tasks - provides a collection of interactive UI components that pop up when users need to perform specific actions (login, create tiles, edit content, etc.), each with its own focused interface and workflow.

## Responsibilities
- Export specialized widget components for complex user interactions in chat
- Provide Portal infrastructure for rendering widgets outside normal DOM flow
- Supply consistent widget base components and styling patterns via _shared
- Handle individual widget state management and user input
- Coordinate with chat timeline for widget display and lifecycle

## Non-Responsibilities
- Tile data operations and persistence → See `~/app/map/Cache/README.md`
- Authentication business logic → See `~/lib/auth/README.md`
- AI job processing and execution → See `~/lib/domains/agentic/README.md`
- Chat message rendering and timeline management → See `../Messages/README.md`
- AI response content display and job tracking → See `./AIResponseWidget/README.md`
- User authentication forms and flows → See `./LoginWidget/README.md`
- Tile preview and editing interfaces → See `./TileWidget/README.md`
- MCP key management operations → Handled by McpKeysWidget
- Shared widget components and styling → Handled by _shared directory

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.