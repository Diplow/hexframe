# Architecture: PreviewWidget Subsystem

## Overview
See [README.md](./README.md) for why this subsystem exists.

## Internal Structure

```
PreviewWidget/
├── interface.ts         # Public API
├── dependencies.json    # Allowed imports
├── index.tsx            # Main preview widget
├── ActionMenu.tsx       # Preview action buttons
├── ContentDisplay.tsx   # Tile content rendering
├── EditControls.tsx     # Save/cancel controls
├── PreviewHeader.tsx    # Widget header
└── usePreviewState.tsx  # State management hook
```

## Key Patterns

- **Mode State Management**: Clear separation between preview and edit modes
- **Component Composition**: Widget built from specialized sub-components
- **State Hook Pattern**: Centralized state management via custom hook
- **Controlled Components**: Form inputs controlled by parent state
- **Action Delegation**: Operations delegated to parent via callbacks

## Dependencies

| Dependency | Purpose |
|------------|---------|
| react | Core hooks and components |
| ~/components/ui/* | UI components (Button, Input, Textarea) |
| ~/lib/utils | Utility functions (cn for classnames) |
| lucide-react | Icons (Edit, Save, X, Trash2, etc.) |

## Interactions

### Inbound (Who uses this subsystem)
- **Widget Renderers** → Renders PreviewWidget for tile selection
- **Chat System** → Creates preview widgets when tiles are selected

### Outbound (What this subsystem uses)
- **Map Cache** ← For tile update operations (via callbacks)
- **UI Components** ← For consistent styling and behavior
- **Parent Components** ← For tile operations via callback props

## State Flow

1. **Initialization** → Widget opens in preview mode showing tile content
2. **Mode Switching** → User can switch to edit mode via action menu
3. **Content Editing** → Edit mode enables content modification
4. **Save/Cancel** → User can save changes or cancel edit mode
5. **Actions** → Delete and close actions available via menu
6. **Completion** → Widget closes or returns to preview mode

## Widget Modes

- **Preview Mode**: Read-only display with action menu
- **Edit Mode**: Editable content with save/cancel controls

## Integration Points

The PreviewWidget integrates with:
- Map Cache for tile data operations
- Chat state for widget lifecycle
- Parent components for navigation and tile operations