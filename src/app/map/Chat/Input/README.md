# Chat Input Subsystem

## Why This Exists
The Input subsystem handles all user text input and command processing for the chat interface, providing command autocomplete, input history, and proper text area controls for an enhanced user experience.

## Mental Model
Think of Input as a smart command line interface that transforms user text into structured commands and messages for the chat system.

## Core Responsibility
This subsystem owns:
- Text input processing and validation
- Command parsing and autocomplete
- Input history management
- Textarea keyboard controls and focus management

This subsystem does NOT own:
- Command execution (delegates to chat state/services)
- Message display (delegates to Messages subsystem)
- Widget lifecycle (delegates to Widgets subsystem)

## Public API
See `interface.ts` for the public API. Main capabilities:
- `Input` - Main input component
- `useCommandHandling` - Command processing hook
- `useInputHistory` - Input history management
- `useTextareaController` - Textarea control logic

## Dependencies
See `dependencies.json` for allowed imports.

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for structure details.