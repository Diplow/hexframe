# Architecture: Chat Input Subsystem

## Overview
See [README.md](./README.md) for why this subsystem exists.

## Internal Structure

```
Input/
├── interface.ts              # Public API
├── dependencies.json         # Allowed imports
├── index.tsx                 # Main Input component
├── _components/              # Input-specific UI components
│   └── CommandAutocomplete.tsx  # Autocomplete dropdown
├── _hooks/                   # Input state management
│   ├── useCommandHandling.ts    # Command parsing logic
│   ├── useInputHistory.ts       # History navigation
│   └── useTextareaController.ts # Textarea controls
└── _services/                # Input processing services
    └── chatInputService.ts      # Input processing service
```

## Key Patterns

- **Hook Composition**: Multiple specialized hooks compose together in main component
- **Command Pattern**: Text input is parsed into command objects
- **History Management**: Maintains input history with navigation controls
- **Autocomplete System**: Provides intelligent command suggestions
- **Textarea Enhancement**: Proper keyboard handling and focus management

## Dependencies

| Dependency | Purpose |
|------------|---------|
| react | Core hooks (useState, useRef, useEffect) |
| lucide-react | Icons (Send, Command, Terminal) |
| ~/components/ui/button | UI button component |
| ~/lib/debug/debug-logger | Debug logging |
| ../\_state | Access to chat state |

## Interactions

### Inbound (Who uses this subsystem)
- **ChatPanel** → Renders Input component as part of chat interface

### Outbound (What this subsystem uses)
- **Chat State** ← For dispatching user messages and commands
- **Debug Logger** ← For development debugging
- **UI Components** ← For consistent button styling

## Command Processing Flow

1. **User Types** → Text captured in controlled input
2. **Command Detection** → useCommandHandling analyzes input for commands
3. **Autocomplete** → Suggestions shown if command detected
4. **Submission** → Text processed and sent to chat state
5. **History** → Input saved to history for future navigation