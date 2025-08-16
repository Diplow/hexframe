# Architecture: Chat Widgets Subsystem

## Overview
See [README.md](./README.md) for why this subsystem exists.

## Internal Structure

```
Widgets/
├── interface.ts              # Public API
├── dependencies.json         # Allowed imports
├── Portal.tsx                # Widget portal container
├── CreationWidget.tsx        # Tile creation widget
├── ErrorWidget.tsx           # Error display widget
├── LoadingWidget.tsx         # Loading state widget
├── ConfirmDeleteWidget.tsx   # Deletion confirmation
├── AIResponseWidget/         # AI interaction widget
│   └── index.tsx            # Main AI response component
├── LoginWidget/              # Authentication widget
│   ├── index.tsx            # Main login component
│   ├── LoginWidget.tsx      # Core login functionality
│   ├── FormActions.tsx      # Login form actions
│   ├── FormFields.tsx       # Input fields
│   ├── FormHeader.tsx       # Form header
│   ├── StatusMessages.tsx   # Status feedback
│   └── useLoginForm.tsx     # Login form state
└── PreviewWidget/            # Tile preview and editing
    ├── index.tsx            # Main preview component
    ├── ActionMenu.tsx       # Preview actions
    ├── ContentDisplay.tsx   # Content rendering
    ├── EditControls.tsx     # Edit mode controls
    ├── PreviewHeader.tsx    # Preview header
    └── usePreviewState.tsx  # Preview state management
```

## Key Patterns

- **Widget Composition**: Complex widgets composed of smaller, focused components
- **State Isolation**: Each widget manages its own internal state
- **Portal Rendering**: Widgets can render outside normal DOM flow when needed
- **Form Management**: Structured form handling with validation and state
- **Action Callbacks**: Widgets communicate via callback props
- **Conditional Rendering**: Widgets appear/disappear based on chat events

## Dependencies

| Dependency | Purpose |
|------------|---------|
| react | Core hooks and components |
| lucide-react | Icon components |
| ~/lib/utils | Utility functions (cn) |
| ~/components/ui/* | Shared UI components |
| ~/lib/domains/mapping/* | Coordinate system utilities |
| ~/app/map/Cache/interface | Map cache operations |

## Interactions

### Inbound (Who uses this subsystem)
- **Messages Subsystem** → Renders widgets in message timeline
- **Widget Renderers** → Use specific widget components

### Outbound (What this subsystem uses)
- **Map Cache** ← For tile operations (create, update, delete)
- **UI Components** ← For consistent styling and behavior
- **Mapping Domain** ← For coordinate calculations and utilities
- **Auth System** ← For authentication operations

## Widget Lifecycle

1. **Widget Creation** → Chat event triggers widget creation in state
2. **Rendering** → Messages subsystem renders appropriate widget
3. **User Interaction** → Widget handles internal state and user input
4. **Action Execution** → Widget calls external services via callbacks
5. **Completion** → Widget signals completion, gets removed from state

## Widget Types

- **Preview/Edit Widgets**: Complex tile viewing and editing
- **Creation Widgets**: Multi-step tile creation flows
- **Confirmation Widgets**: User confirmation for destructive actions
- **Status Widgets**: Loading, error, and success states
- **Authentication Widgets**: Login and registration flows
- **AI Widgets**: AI interaction and response display