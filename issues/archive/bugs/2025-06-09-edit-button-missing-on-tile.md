# Debug Session: Edit Button Missing on Tile

## Issue Description
The edit button does not appear on a tile when it should be visible.

### Working Assumption
Based on the issue description mentioning "edit button", I'm assuming this is primarily a problem with the **dynamic route (`/map`)** since:
- Edit functionality is listed as a "Confirmed Dynamic Requirement" in the architecture
- The static route likely uses fallback patterns for editing (separate edit pages)
- Interactive buttons are more common in the dynamic version

If investigation reveals this assumption is incorrect, I'll expand to the static route.

## Architectural Context

### Understanding the Architecture
Based on the README.md architecture section, I need to investigate:

1. **Frontend Layer** (Next.js 15 App Router) - Most likely location since this is a UI element
   - Progressive enhancement with static, progressive, and dynamic components
   - Reference: `/src/app/map/ARCHITECTURE.md` for detailed component patterns

2. **Potentially Related Layers**:
   - **Domain Layer** - If there's business logic controlling edit permissions
   - **Backend Layer** - If edit visibility depends on server-side authorization

Let me read the frontend architecture documentation to understand how tile components work.

---

After reading `/src/app/map/ARCHITECTURE.md`, I can identify where the edit button should be located:

### Architectural Understanding

The Hexframe map application uses a layered architecture with dual routes:
- `/map` - Dynamic version with full interactivity
- `/static/map` - Static version that works without JavaScript

For the edit button on tiles, the relevant components are:

1. **Tile Layer** (Most relevant):
   - `ItemTile` (`Tile/Item/item.tsx`) - Renders item content and basic buttons
   - `ItemButtons` (`Tile/Item/item.buttons.tsx`) - Where edit button is defined
   - Future: `DraggableItemTile` for dynamic features

2. **Controls Layer**:
   - `ActionPanel` (`Controls/ActionPanel.tsx`) - Manages interaction modes (select, edit, delete)
   - The edit mode might control whether edit buttons are visible

3. **Canvas Layer**:
   - `DynamicMapCanvas` - Acts as centralized action coordinator, providing context for tile actions
   - Manages interaction state and provides handlers to descendant tiles

### How This Should Work

Based on the architecture:

1. **Edit Button Rendering**: The edit button should be rendered by `StaticItemButtons` component within the `StaticItemTile`
2. **Visibility Control**: Edit button visibility might be controlled by:
   - User permissions (from auth context)
   - Current interaction mode (from ActionPanel)
   - Item ownership or edit permissions
3. **Action Handling**: When clicked, the edit action would be coordinated through the centralized action management in `DynamicMapCanvas`

### Outdated Documentation Found

The ARCHITECTURE.md was outdated and referenced a progressive enhancement pattern that no longer exists:
- Referenced `.static` files that don't exist (e.g., `item.static.tsx`)
- Described wrapping patterns that aren't used anymore
- The actual architecture uses separate route hierarchies:
  - `/map/*` - Dynamic components
  - `/static/map/*` - Static components

**Action Taken**: Updated ARCHITECTURE.md to reflect the actual dual-route architecture where static and dynamic versions maintain separate component hierarchies rather than using progressive enhancement.

### Investigation Focus

Based on my assumption that this is a dynamic route issue, I'll focus on:

1. **Primary Investigation (Dynamic Route)**:
   - `src/app/map/Tile/Item/item.buttons.tsx` - Where edit button logic lives
   - `src/app/map/Tile/Item/item.tsx` - How buttons are integrated
   - `src/app/map/Controls/index.tsx` - Interaction mode management
   - `src/app/map/Canvas/index.tsx` - Centralized action coordination

2. **Permission/Auth Investigation**:
   - Check if user has edit permissions
   - Verify auth context is properly provided
   - Look for permission checks in button rendering

3. **State Management**:
   - MapCache state that might affect button visibility
   - Interaction mode from Controls
   - Any loading states that might hide buttons

---