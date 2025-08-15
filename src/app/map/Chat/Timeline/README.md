# Chat Messages Subsystem

## Why This Exists
The Messages subsystem handles the display and rendering of all chat content including user messages, system notifications, and embedded widgets, providing a unified timeline view with proper formatting and interaction capabilities.

## Mental Model
Think of Messages as a sophisticated rendering engine that transforms chat events and widgets into a coherent, interactive timeline with proper formatting, timestamps, and user interactions.

## Core Responsibility
This subsystem owns:
- Message display and formatting (markdown, timestamps, actors)
- Widget rendering within the message timeline
- Day separation and chronological organization
- Message interaction handling (copy, click actions)
- Timeline scrolling and layout

This subsystem does NOT own:
- Message creation or state management (delegates to chat state)
- Widget behavior logic (delegates to Widget subsystem)
- Input processing (delegates to Input subsystem)

## Public API
See `interface.ts` for the public API. Main capabilities:
- `Messages` - Main messages container component
- `UnifiedTimeline` - Timeline rendering component
- `MessageTimeline` - Message-specific timeline
- Various renderer components for specific content types

## Dependencies
See `dependencies.json` for allowed imports.

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for structure details.