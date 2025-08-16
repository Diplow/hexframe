# PreviewWidget Subsystem

## Why This Exists
The PreviewWidget provides a comprehensive tile viewing and editing interface within the chat system, allowing users to preview tile content, switch to edit mode, and perform tile operations like save, delete, and close with a rich, interactive experience.

## Mental Model
Think of PreviewWidget as a mini tile editor that appears in the chat timeline, providing both read-only preview and full editing capabilities with proper state management and user controls.

## Core Responsibility
This subsystem owns:
- Tile content preview and display
- Edit mode state management and UI
- Content editing with real-time updates
- Action menu for tile operations (edit, delete, close)
- Edit controls for save/cancel operations
- Preview state coordination

This subsystem does NOT own:
- Actual tile data persistence (delegates to Map Cache)
- Tile deletion logic (delegates to parent components)
- Navigation or routing (delegates to calling components)

## Public API
See `interface.ts` for the public API. Main capabilities:
- `PreviewWidget` - Main tile preview/edit widget
- `ActionMenu` - Preview action buttons
- `ContentDisplay` - Tile content rendering
- `EditControls` - Save/cancel edit controls
- `PreviewHeader` - Widget header component
- `usePreviewState` - Preview state management hook

## Dependencies
See `dependencies.json` for allowed imports.

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for structure details.