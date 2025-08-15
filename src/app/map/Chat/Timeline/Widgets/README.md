# Chat Widgets Subsystem

## Why This Exists
The Widgets subsystem provides interactive UI components that handle complex user operations within the chat interface, including tile creation, editing, authentication, and confirmation dialogs that require structured input or multi-step interactions.

## Mental Model
Think of Widgets as specialized modal-like components that appear in the chat timeline to handle operations that require more than simple text input or display.

## Core Responsibility
This subsystem owns:
- Interactive widget UI components (creation, preview, login, etc.)
- Widget state management and lifecycle
- Form handling and validation within widgets
- Widget-specific user interactions and callbacks
- Portal rendering for complex widgets

This subsystem does NOT own:
- Widget lifecycle in chat timeline (delegates to Messages subsystem)
- Backend operations (delegates to appropriate domains/services)
- Chat state management (delegates to chat state)

## Public API
See `interface.ts` for the public API. Main capabilities:
- `PreviewWidget` - Tile preview and editing
- `CreationWidget` - New tile creation
- `LoginWidget` - Authentication flows
- `ConfirmDeleteWidget` - Deletion confirmation
- `ErrorWidget` - Error display
- `LoadingWidget` - Operation progress
- `AIResponseWidget` - AI interaction display

## Dependencies
See `dependencies.json` for allowed imports.

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for structure details.