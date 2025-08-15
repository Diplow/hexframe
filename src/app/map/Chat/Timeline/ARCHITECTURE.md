# Architecture: Chat Messages Subsystem

## Overview
See [README.md](./README.md) for why this subsystem exists.

## Internal Structure

```
Messages/
├── interface.ts                  # Public API
├── dependencies.json             # Allowed imports
├── index.tsx                     # Main Messages container
├── UnifiedTimeline.tsx           # Unified timeline component
├── MessageTimeline.tsx           # Message-specific timeline
├── DaySeparator.tsx              # Day grouping component
├── MarkdownRenderer.tsx          # Markdown content rendering
├── MessageActorRenderer.tsx      # Actor-specific formatting
├── TimestampRenderer.tsx         # Timestamp display
├── CommandButtonRenderer.tsx     # Command button rendering
├── CopyButton.tsx                # Copy functionality
├── UserClickHandler.tsx          # User interaction handling
├── WidgetManager.tsx             # Widget lifecycle in messages
├── _handlers/                    # Message action handlers
│   ├── creation-handlers.ts      # Creation message handlers
│   └── preview-handlers.ts       # Preview message handlers
├── _hooks/                       # Messages-specific hooks
│   └── useAuthStateCoordinator.ts # Auth state coordination
├── _renderers/                   # Specialized renderers
│   └── widget-renderers.tsx      # Widget rendering functions
└── _utils/                       # Message utilities
    └── focus-helpers.ts          # Focus management utilities
```

## Key Patterns

- **Renderer Pattern**: Specialized components for different content types
- **Timeline Organization**: Chronological display with day separators
- **Handler Pattern**: Dedicated handlers for different message actions
- **Widget Integration**: Seamless embedding of widgets in message flow
- **Markdown Support**: Rich text rendering with custom components
- **Actor-based Formatting**: Different styling for user/system/assistant messages

## Dependencies

| Dependency | Purpose |
|------------|---------|
| react | Core hooks and components |
| ~/lib/debug/debug-logger | Debug logging |
| ../\_state/types | Widget and message types |
| ../\_state/\_events/event.types | Event type definitions |
| ../\_settings/useChatSettings | Chat configuration |

## Interactions

### Inbound (Who uses this subsystem)
- **ChatPanel** → Renders Messages component as part of chat interface

### Outbound (What this subsystem uses)
- **Chat State** ← For accessing message and widget data
- **Widget Subsystem** ← For rendering embedded widgets
- **Settings** ← For display preferences
- **Auth System** ← For user state coordination

## Rendering Flow

1. **Data Input** → Receives messages and widgets from chat state
2. **Timeline Organization** → Groups messages by day, interleaves widgets
3. **Content Rendering** → Applies appropriate renderer for each item type
4. **Layout** → Manages scrolling and visual organization
5. **Interaction** → Handles user clicks, copy actions, and widget interactions