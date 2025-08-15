# Chat Subsystem

## Why This Exists
The Chat subsystem provides a conversational interface to the map system, enabling users to interact with tiles through commands, receive feedback about map operations, and manage widgets for complex user interactions like authentication and tile editing.

## Mental Model
Think of Chat as an event-driven message center that listens to all map activities and provides a user-friendly interface for both viewing system notifications and initiating map operations.

## Core Responsibility
This subsystem owns:
- User message input and command processing
- Event-driven message display (system notifications, user messages)
- Widget lifecycle management (creation, preview, authentication, etc.)
- AI chat integration for enhanced user interaction

This subsystem does NOT own:
- Map data storage or cache management (delegates to Cache subsystem)
- Direct tile operations (delegates to MapCache)
- Authentication logic (uses IAM domain)

## Public API
See `interface.ts` for the public API. Main capabilities:
- `ChatPanel` - Main chat interface component
- `ChatProvider` - State management context
- `useChatState` - Hook for accessing chat state

## Dependencies
See `dependencies.json` for allowed imports.

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for structure details.