# Issue #1 Log: Toolbox Menu UI Improvement for Tile Interactions

This file documents the complete history and evolution of issue #1.

## 2025-06-20 14:35 - Issue Created

*Created by @ulysse via /issue command*

### Initial Problem Statement
Tile buttons appearing on hover makes the general UI feels clunky. We should setup a "toolbox" menu on the left of the screen that would change the click behavior depending on what "tool" is selected. Keyboard shortcut should also be bound to this toolbox. The toolbox should have a toggle that switch behind 3 states: closed, icons only with shortcut and label on hover, and icons + label + shortcut displayed.

### Initial Tags
#enhancement #design #tiles #product

---

## 2025-06-20 22:00 - Solution Design

*Added by @ulysse via /solution command*

### Design Process
- Reviewed context from previous analysis
- Considered 3 different architectural approaches
- Evaluated against project patterns and user requirements

### Detailed Solution Analysis

#### Solution 1 Deep Dive: Context-Based Tool System
This solution extends the existing TileActionsContext to manage tool state. The context would gain:
```typescript
interface ToolState {
  activeTool: 'select' | 'navigate' | 'create' | 'edit' | 'delete';
  toolboxDisplay: 'closed' | 'icons' | 'full';
  setActiveTool: (tool: Tool) => void;
  setToolboxDisplay: (display: ToolboxDisplay) => void;
}
```

The Toolbox component would be positioned fixed on the left side, with CSS transitions between display states. Keyboard shortcuts would be handled by a global hook that listens for key combinations and updates the context.

Implementation would modify the empty handleTileClick method to dispatch based on activeTool:
```typescript
const handleTileClick = (coordId: string) => {
  switch(activeTool) {
    case 'navigate': navigateToItem(coordId); break;
    case 'create': onCreateTileRequested(coordId); break;
    // etc.
  }
};
```

#### Solution 2 Deep Dive: Event Bus System
This approach creates a standalone ToolManager service:
```typescript
class ToolManager extends EventEmitter {
  private activeTool: Tool;
  
  setTool(tool: Tool) {
    this.activeTool = tool;
    this.emit('toolChanged', tool);
  }
}
```

Components would subscribe to tool changes and update their behavior accordingly. This decouples tool management from the React component tree but introduces a new pattern.

#### Solution 3 Deep Dive: URL-State Integration
This leverages the existing URL-first architecture by adding `?tool=navigate` to URLs. The page component would parse this and pass it down through props. Tool changes would use router.push with shallow routing to avoid full page refreshes.

### Decision Factors
- **Consistency**: Solution 1 aligns with existing TileActionsContext pattern
- **Performance**: Solutions 1 and 2 avoid URL updates on every tool change
- **User Experience**: All solutions support the three display modes
- **Implementation Effort**: Solution 1 requires least new infrastructure
- **Future Extensibility**: Solutions 1 and 2 make adding new tools easier

The Context-based approach (Solution 1) was chosen because:
1. It builds on existing patterns developers already understand
2. It centralizes tool state management in a React-friendly way
3. It avoids introducing new architectural patterns
4. It provides good performance characteristics
5. It's easier to test and debug within React DevTools

### Changes Made to Issue File
- Added Solution section with 3 detailed solutions
- Marked Solution 1 (Context-Based Tool System) as preferred
- Documented implementation paths and tradeoffs for each
- Provided clear recommendation with rationale

---

## 2025-06-20 19:52 - Context Analysis

*Added by @ulysse via /context command*

### Investigation Process
- Read issue documentation from `/issues/2025-06-20-toolbox-menu-ui-improvement-1.md`
- Reviewed architecture documentation:
  - `/src/app/map/ARCHITECTURE.md` - Overall map architecture
  - `/src/app/map/Canvas/README.md` - Canvas component documentation
  - `/src/app/map/Tile/README.md` - Tile system documentation
  - `/src/lib/domains/mapping/README.md` - Domain layer documentation
- Analyzed tile interaction implementation:
  - `/src/app/map/Canvas/index.tsx` - TileActionsContext definition
  - `/src/app/map/Tile/Item/item.buttons.tsx` - Current button implementation
  - `/src/app/map/Tile/Empty/empty.tsx` - Empty tile hover interactions
- Searched for existing patterns:
  - No toolbar/toolbox components found
  - No keyboard shortcut implementations found
  - No side panel UI patterns found

### Detailed Findings

**Architecture Analysis**:
The map interface uses a well-structured hierarchical component system with clear separation of concerns. The Canvas layer manages all interactions through TileActionsContext, which currently has empty implementations for click and hover handlers (marked as TODO).

**Current Implementation**:
- Buttons appear on hover using CSS transitions (`opacity-0 group-hover:opacity-100`)
- Five button types: Edit, Delete, URL, Expand/Collapse, Navigate
- Button visibility depends on tile state and user permissions
- Empty tiles show a create button on hover for owned spaces
- All interactions use local state management for hover tracking

**Technical Details**:
- Button positioning: Absolute at `top-[10%]`, centered horizontally
- Scale-responsive sizing from 6x6 to 20x20 based on tile scale
- Event handlers prevent bubbling with stopPropagation
- No global interaction mode or tool selection system exists

**Missing Infrastructure**:
- No toolbar or toolbox components in the codebase
- No keyboard shortcut handling system
- No persistent UI panels for mode/tool selection
- TileActionsContext has placeholder methods ready for implementation

### Synthesis
The investigation revealed that the current hover-based interaction system is implemented entirely through CSS and local component state. The architecture is well-prepared for adding a toolbox system - TileActionsContext already exists as the central interaction hub with empty handlers ready for implementation. No existing toolbar patterns were found, so this would be a new UI pattern for the project.

### Changes Made to Issue File
- Added comprehensive Context section with 4 subsections
- Key insights:
  - Current implementation uses CSS-based hover with opacity transitions
  - TileActionsContext exists with empty handlers ready for toolbox integration
  - No existing toolbar/keyboard shortcut patterns in codebase
  - Architecture supports adding toolbox as new UI layer

---

## 2025-06-20 22:00 - Solution Design

*Added by @ulysse via /solution command*

### Design Process
- Reviewed context from previous analysis
- Considered 3 different architectural approaches
- Evaluated against project patterns and user requirements

### Detailed Solution Analysis

#### Solution 1 Deep Dive: Context-Based Tool System
This solution extends the existing TileActionsContext to manage tool state. The context would gain:
```typescript
interface ToolState {
  activeTool: 'select' | 'navigate' | 'create' | 'edit' | 'delete';
  toolboxDisplay: 'closed' | 'icons' | 'full';
  setActiveTool: (tool: Tool) => void;
  setToolboxDisplay: (display: ToolboxDisplay) => void;
}
```

The Toolbox component would be positioned fixed on the left side, with CSS transitions between display states. Keyboard shortcuts would be handled by a global hook that listens for key combinations and updates the context.

Implementation would modify the empty handleTileClick method to dispatch based on activeTool:
```typescript
const handleTileClick = (coordId: string) => {
  switch(activeTool) {
    case 'navigate': navigateToItem(coordId); break;
    case 'create': onCreateTileRequested(coordId); break;
    // etc.
  }
};
```

#### Solution 2 Deep Dive: Event Bus System
This approach creates a standalone ToolManager service:
```typescript
class ToolManager extends EventEmitter {
  private activeTool: Tool;
  
  setTool(tool: Tool) {
    this.activeTool = tool;
    this.emit('toolChanged', tool);
  }
}
```

Components would subscribe to tool changes and update their behavior accordingly. This decouples tool management from the React component tree but introduces a new pattern.

#### Solution 3 Deep Dive: URL-State Integration
This leverages the existing URL-first architecture by adding `?tool=navigate` to URLs. The page component would parse this and pass it down through props. Tool changes would use router.push with shallow routing to avoid full page refreshes.

### Decision Factors
- **Consistency**: Solution 1 aligns with existing TileActionsContext pattern
- **Performance**: Solutions 1 and 2 avoid URL updates on every tool change
- **User Experience**: All solutions support the three display modes
- **Implementation Effort**: Solution 1 requires least new infrastructure
- **Future Extensibility**: Solutions 1 and 2 make adding new tools easier

The Context-based approach (Solution 1) was chosen because:
1. It builds on existing patterns developers already understand
2. It centralizes tool state management in a React-friendly way
3. It avoids introducing new architectural patterns
4. It provides good performance characteristics
5. It's easier to test and debug within React DevTools

### Changes Made to Issue File
- Added Solution section with 3 detailed solutions
- Marked Solution 1 (Context-Based Tool System) as preferred
- Documented implementation paths and tradeoffs for each
- Provided clear recommendation with rationale

---
## 2025-06-20 22:13 - Test Planning

*Added by @ulysse via /tests command*

### Test Planning Process
- Analyzed chosen solution (Context-Based Tool System) for testable behaviors
- Identified 14 unit tests, 4 integration tests, 4 E2E tests
- Considered accessibility and performance aspects
- Reviewed existing test patterns in the codebase

### Detailed Test Specifications

#### Unit Test Details
**Toolbox Component Tests**:
- Display mode transitions using finite state machine pattern
- Tool selection with mocked context providers
- Visual feedback verification using data attributes
- Keyboard shortcut display logic based on mode

**Context Extension Tests**:
- Provider/consumer pattern verification
- State propagation using React Testing Library
- Re-render optimization checks with React DevTools Profiler

**Keyboard Hook Tests**:
- Event listener lifecycle management
- Key combination handling with modifier key checks
- Input field conflict prevention using event.target checks

#### Integration Test Details
**Tool System Integration**:
- Full component tree rendering with providers
- Cross-component communication verification
- Tool-specific behavior dispatch testing
- Visual feedback coordination across components

Test setup will use a custom renderWithProviders utility:
```typescript
const renderWithProviders = (ui: ReactElement) => {
  return render(
    <TileActionsProvider>
      {ui}
    </TileActionsProvider>
  );
};
```

#### E2E Test Details
**User Workflows**:
- Display mode transitions with visual regression checks
- Tool selection affecting tile behavior
- Global keyboard shortcut functionality
- State persistence using localStorage

E2E tests will use Playwright's offline mode with data-testid selectors for reliability.

### Test Infrastructure Notes
- **New Test Utilities**:
  - renderWithProviders helper for integration tests
  - mockTileActionsContext for isolated unit tests
  - Custom keyboard event simulator
  
- **Mocking Requirements**:
  - TileActionsContext for component tests
  - Router.push for navigation tests
  - localStorage for persistence tests

- **Test Data**:
  - Sample tile configurations
  - Tool state fixtures
  - Keyboard event sequences

- **CI/CD Considerations**:
  - E2E tests require dev server running
  - Visual regression tests need baseline images
  - Accessibility tests use axe-core

### Changes Made to Issue File
- Added comprehensive Tests section
- Documented 22 test cases across 3 categories
- Included TypeScript code examples for E2E tests
- Added accessibility and performance test considerations

---
EOF < /dev/null
