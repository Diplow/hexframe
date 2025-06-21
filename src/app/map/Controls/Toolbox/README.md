# Toolbox Component

The Toolbox provides a UI for selecting tools to interact with the hexagonal map. It supports three display modes and smooth animations between states.

## Architecture

### Core Components

**Toolbox** (`Toolbox.tsx`)
- Main container component
- Manages tool selection and state
- Coordinates sub-components

**ToolboxToggle** (`_components/ToolboxToggle.tsx`)
- Header button that controls expansion/collapse
- Shows chevron with smooth rotation animation
- Displays "Toolbox" label and "T" shortcut in full mode

**ToolButton** (`_components/ToolButton.tsx`)
- Individual tool button component
- Handles active/disabled/hover states
- Shows tool icon, label, and keyboard shortcut

**ToolTooltip** (`_components/ToolTooltip.tsx`)
- Hover tooltip shown in icons mode
- Displays tool name and keyboard shortcut

### Hooks

**useToolboxCycle** (`_hooks/useToolboxCycle.ts`)
- Manages the 4-state animation cycle
- Persists state to localStorage
- Provides display mode derived from cycle position

**useToolboxKeyboard** (`_hooks/useToolboxKeyboard.ts`)
- Handles 'T' key for toggling toolbox
- Respects input field focus and modifier keys

### Utilities

**tool-styles** (`_utils/tool-styles.ts`)
- Centralized styling for tool buttons
- Color theming system for each tool type
- Handles active/disabled/hover states

**toolbox-layout** (`_utils/toolbox-layout.ts`)
- Calculates dynamic height based on tool count
- Centers toolbox vertically on screen

**toolbox-visibility** (`_utils/toolbox-visibility.ts`)
- Manages complex visibility rules during animations
- Converts cycle position to display mode
- Controls chevron rotation angles

## Display Modes

1. **Closed**: Only shows toggle button and active tool
2. **Icons**: Shows tool icons with hover tooltips
3. **Full**: Shows icons, labels, and keyboard shortcuts

## Animation Cycle

The toolbox uses a 4-position cycle for smooth animations:
```
0: closed
1: icons (opening from closed)
2: full
3: icons (closing to closed)
```

This allows different transition speeds and behaviors when opening vs closing.

## Tools

- **Expand** (X): Expand tiles to show children
- **Navigate** (N): Navigate to different tiles
- **Create** (C): Create new tiles
- **Edit** (E): Edit tile content
- **Move** (M): Drag tiles to new positions
- **Delete** (D): Delete tiles

## Keyboard Shortcuts

- **T**: Toggle toolbox display mode
- **X/N/C/E/M/D**: Select respective tools (when not in input fields)

## State Management

- Active tool is managed by `TileActionsContext`
- Display mode persists to localStorage
- Disabled tools are determined by map state

## Styling

Each tool has an associated color theme:
- Expand: Indigo
- Navigate: Cyan
- Create: Green
- Edit: Amber
- Move: Purple
- Delete: Rose

Colors are applied to:
- Button background when active
- Focus ring color
- Icon and text colors
- Consistent theming across light/dark modes