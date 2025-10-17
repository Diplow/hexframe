# Canvas

## Mental Model
Like a digital art canvas - provides the interactive surface where hexagonal tiles are rendered and users can interact with them through clicks, drags, and visual feedback.

## Responsibilities
- Renders the main interactive map canvas (DynamicMapCanvas) with hexagonal tile layouts
- Handles user interactions like clicking, dragging, and hovering on tiles
- Provides context menu for tile actions including expansion, navigation, editing, and composition toggling
- Provides lifecycle components for error boundaries and loading states
- Manages tile action contexts and providers for distributing user actions
- Orchestrates the hexagonal coordinate system and tile positioning

## Non-Responsibilities
- Individual tile rendering and behavior → See `./Tile/README.md`
- Data persistence and state management → See `../Cache/README.md`
- Chat functionality and text input → See `../Chat/README.md`
- Business logic for map operations → See `../Cache/README.md`
- Authentication and user management → See external contexts

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.