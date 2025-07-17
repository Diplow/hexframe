# Issue: Multiple UI/UX Bugs in Current Version

**Date**: 2025-07-17
**Status**: Open
**Tags**: #bug #navigation #theme #chat #tiles #ui #high
**GitHub Issue**: #83
**Branch**: issue-14-multiple-ui-ux-bugs

## Problem Statement
The current version has multiple UI/UX issues affecting core functionality:
- Navigation problems (home page redirect)
- Theme loading causes visual flicker
- Chat functionality completely broken
- Tile interaction issues (expansion, text selection, overflow)
- Widget spacing problems
- Missing loading indicators
- Chat commands non-functional

## User Impact
- **Who is affected?** All users
- **What can't they do?** 
  - Cannot use chat at all (sending messages or logging in)
  - Experience poor visual quality (theme flicker, text overflow)
  - Difficult tile interactions (unwanted text selection, improper expansion)
  - No feedback when data is loading
- **How critical is this to their workflow?** Very critical - chat is a core feature, and UI issues affect all interactions

## Steps to Reproduce

### 1. Home Page Redirect Issue
1. Navigate to `/` 
2. Expected: Redirect to `/map?center=1`
3. Actual: Shows home page

### 2. Theme Flicker
1. Load any page
2. Observe initial render with default theme
3. Theme switches after first render causing visual flicker

### 3. Chat Not Working
1. Open chat panel
2. Type a message
3. Try to send
4. Expected: Message sends
5. Actual: Nothing happens

### 4. Chat Login Issues
1. Try logging in via chat command
2. Try logging in via login chat header click
3. Neither method works

### 5. Scale 1 Tile Expansion
1. Find a scale 1 tile
2. Double-click it
3. Expected: No expansion (scale 1 is lowest level)
4. Actual: Attempts to expand

### 6. Scale 1 Text Overflow
1. View scale 1 tiles with long titles
2. Text extends beyond tile boundaries
3. Should truncate earlier

### 7. Text Selection Issue
1. Double-click to expand any tile
2. Large amount of text gets selected
3. Makes reading difficult
4. Text selection extends outside clicked tile

### 8. Widget Spacing
1. View any widgets
2. No spacing between widgets and surrounding elements
3. Need at least 2px top and bottom spacing

### 9. Missing Loading Indicator
1. Trigger mapCache loading in UserProfileTile
2. No visual feedback that data is loading
3. User doesn't know if action is processing

### 10. Chat Commands
1. Try using any chat command
2. Commands are not recognized or executed

## Environment
- Browser/OS: All browsers
- User role: All users
- Frequency: Always

## Related Issues
- Previous chat functionality issues
- UI/UX improvements
- Theme system updates

## Context

*I am an AI assistant acting on behalf of @Diplow*

### Existing Documentation
- **Architecture Docs**: `/src/app/map/ARCHITECTURE.md` - Comprehensive frontend architecture ✅
- **Server README**: `/src/server/README.md` - Backend architecture and API layer ✅
- **Domain README**: `/src/lib/domains/README.md` - Domain-driven design principles ✅
- **Documentation vs Reality**: Architecture documentation is accurate and up-to-date ✅

### Domain Overview
Hexframe uses a three-layer architecture:
1. **Frontend**: Next.js 15 App Router with hexagonal map interface
2. **Backend**: tRPC API for type-safe communication and domain orchestration
3. **Domain Layer**: DDD with strict domain independence

Key components involved in these bugs:
- **MapCache**: Central data management with event bus integration
- **Canvas**: Visual rendering layer for tiles
- **Chat**: Event-driven conversational interface
- **Theme System**: Client-side React context for theme management

### Key Components

#### 1. Home Page Redirect (Bug #1)
- **Current Flow**: `/` → `/home` → (auth check) → `/map?center={id}`
- **Root Page**: `/src/app/page.tsx` - Currently redirects to `/home`
- **Home Page**: `/src/app/home/page.tsx` - Shows welcome screen or redirects
- **Map Page**: `/src/app/map/page.tsx` - Handles missing center param

#### 2. Theme System (Bug #2)
- **ThemeContext**: `/src/contexts/ThemeContext.tsx` - Client-side only
- **Root Cause**: Theme loads from localStorage in useEffect after first render
- **Missing**: No inline script to prevent flash of unstyled content (FOUC)

#### 3. Chat System (Bugs #3, #4, #10)
- **Critical Issue**: Multiple components call `useChatState()` creating separate state instances
- **Affected Components**:
  - `ChatContent` (displays messages) - own state instance
  - `Input` (sends messages) - own state instance
  - `ChatHeader`, `useChatInputService`, `useCommandHandling` - more instances
- **Result**: Messages sent in Input's state don't appear in ChatContent's state
- **Test Coverage**: Tests mock child components, missing integration testing

#### 4. Tile Interactions (Bugs #5, #6, #7)
- **Scale 1 Expansion**: 
  - `item-tile-content.tsx:63` - Correctly sets `canExpand: false` for scale 1
  - `TileActionsContext.tsx:105` - Double-click handler ignores `canExpand` state
- **Text Overflow**: 
  - `content.tsx:39` - Removed truncation for multi-line support
  - Scale 1 tiles need truncation but don't have it
- **Text Selection**:
  - Missing `select-none` CSS class on tile text
  - Double-click naturally selects text across multiple elements

#### 5. UI Polish (Bugs #8, #9)
- **Widget Spacing**: 
  - `UnifiedTimeline.tsx:77` - Uses `my-0.5` (2px) instead of proper spacing
  - Messages have `space-y-3` (12px) creating inconsistency
- **Loading States**:
  - `parent-hierarchy.tsx:101-174` - UserProfileTile has no loading indicator
  - `LoadingWidget.tsx` exists but isn't used for mapCache operations
  - Navigation handler doesn't emit loading events

### Implementation Details

#### Chat State Management Pattern
```typescript
// Current problematic pattern - each component gets its own state
function ChatContent() {
  const chatState = useChatState(); // Instance 1
}

function Input() {
  const chatState = useChatState(); // Instance 2 - different from Instance 1!
}
```

#### Theme Loading Issue
```typescript
// Current implementation - causes flicker
useEffect(() => {
  const savedTheme = localStorage.getItem('theme') as Theme | null;
  if (savedTheme && themes.includes(savedTheme)) {
    setTheme(savedTheme); // This happens after first render
  }
}, []);
```

#### Tile Double-Click Handler
```typescript
// TileActionsContext.tsx - doesn't check canExpand
handleDoubleClick: useCallback(() => {
  onExpandClick(); // Always expands, ignoring tile's canExpand state
}, [onExpandClick]);
```

### Dependencies and Integration

#### Event Bus Pattern
- **Notification Events**: Canvas → MapCache → EventBus → Chat
- **Request Events**: Canvas → EventBus → Chat (for UI coordination)
- Chat listens to ALL events but state isolation prevents proper updates

#### Critical Dependencies
- Theme system depends on client-side React hooks
- Chat components depend on shared state (but don't share it)
- Tile interactions depend on scale calculations and canExpand state
- UserProfileTile depends on tRPC API calls without loading feedback

### Test Coverage Gaps
- Chat tests use mocked components, missing integration testing
- No tests for theme flicker prevention
- Missing tests for scale 1 expansion blocking
- No tests for loading state user feedback