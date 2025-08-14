# Canvas

## Why This Exists
Canvas provides the visual rendering layer for the hexagonal map interface, handling tile display and user interactions within the hexagonal coordinate system.

## Mental Model
Canvas is the "screen" - it renders what Cache knows and translates user gestures into Cache updates.

## Core Responsibility
This subsystem owns:
- Hexagonal tile rendering and layout
- User interaction handling (click, drag, hover)
- Visual feedback for drag-and-drop operations

This subsystem does NOT own:
- Map data or state management (delegates to Cache)
- Business logic for tile operations (delegates to Cache)
- Chat or text input capabilities (emits events to Chat)

## Public API
See `interface.ts` for the public API. Main capabilities:
- `DynamicMapCanvas` - Primary interactive map component
- `BaseFrame` - Static hexagonal layout for non-interactive contexts
- `BaseTileLayout` - Core hexagonal tile rendering
- `MapLoadingSkeleton` - Loading state representation

## Dependencies
See `dependencies.json` for allowed imports.

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for structure details.