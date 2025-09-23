# Timeline

## Mental Model
Like a chronological photo album that automatically organizes mixed content - merges messages and widgets into a unified timeline sorted by timestamp, with day separators to provide clear temporal organization.

## Responsibilities
- Merge messages and widgets into a unified chronological timeline sorted by timestamp
- Group timeline items by day with visual separators for temporal organization
- Auto-scroll timeline to show latest content as new items arrive
- Coordinate chat settings and auth state changes for proper rendering
- Export single Timeline component as clean public interface

## Non-Responsibilities
- Specific widget rendering and behavior → See `./Widgets/README.md`
- Message display components and formatting → Handled by _components directory
- Core timeline rendering logic → Handled by _core directory
- Timeline utility functions and helpers → Handled by _utils directory

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.