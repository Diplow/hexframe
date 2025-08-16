# AIResponseWidget Subsystem

## Why This Exists
The AIResponseWidget handles the display of AI job processing states and responses, providing real-time feedback for asynchronous AI operations with polling, progress indication, and error handling for a complete user experience.

## Mental Model
Think of AIResponseWidget as a smart status display that tracks AI job lifecycle from queued → processing → completed/failed, with appropriate visual feedback for each state.

## Core Responsibility
This subsystem owns:
- AI job status polling and state management
- Real-time progress indication and elapsed time tracking
- AI response content display with markdown rendering
- Error state handling and user feedback
- Dynamic styling injection for animations

This subsystem does NOT own:
- AI job execution (delegates to Agentic domain)
- Markdown rendering logic (uses Messages subsystem)
- Job creation or queuing (delegates to calling components)

## Public API
See `interface.ts` for the public API. Main capabilities:
- `AIResponseWidget` - Main AI response display component
- Support for both direct responses and async job tracking

## Dependencies
See `dependencies.json` for allowed imports.

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for structure details.