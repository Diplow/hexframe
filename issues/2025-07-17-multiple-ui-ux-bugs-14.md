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

## Solution

*I am an AI assistant acting on behalf of @Diplow*

### Overview

I've grouped the 10 bugs into 5 categories and designed multiple solutions for each. The bugs range from critical functionality issues (chat completely broken) to UI polish items.

### 1. Navigation & Theme Issues (Bugs #1-2)

#### Bug #1: Home Page Redirect

**Solution A: Direct Redirect**
- Modify `/src/app/page.tsx` to redirect directly to `/map?center=1`
- Remove intermediate `/home` redirect
- Simplest implementation: `redirect('/map?center=1')`
- **Pros**: Simple, immediate fix, reduces redirects
- **Cons**: Loses welcome screen for new users

**Solution B: Smart Redirect**
- Keep `/home` page but add logic to check if user has visited before
- Use localStorage flag to skip welcome screen for returning users
- **Pros**: Preserves onboarding experience
- **Cons**: More complex, requires state management

**Solution C: Map Page Enhancement**
- Make `/map` the home page, integrate welcome content inline
- Show onboarding overlay on first visit
- **Pros**: No redirects, unified experience
- **Cons**: Requires redesigning onboarding flow

#### Bug #2: Theme Flicker

**Solution A: Inline Script (Recommended)**
```typescript
// In app/layout.tsx before </head>
<script dangerouslySetInnerHTML={{
  __html: `
    (function() {
      const theme = localStorage.getItem('theme') || 'light';
      document.documentElement.classList.add(theme);
    })();
  `
}} />
```
- **Pros**: Prevents flicker completely, simple implementation
- **Cons**: Uses dangerouslySetInnerHTML

**Solution B: Cookies + Server Components**
- Store theme preference in cookies
- Read cookie in layout.tsx server component
- Apply theme class server-side
- **Pros**: No inline scripts, SSR-friendly
- **Cons**: Requires cookie management, more complex

**Solution C: CSS Custom Properties**
- Use CSS variables for theming
- Set initial values inline based on localStorage
- **Pros**: Smooth transitions, flexible theming
- **Cons**: Requires refactoring theme system

### 2. Chat System Fix (Bugs #3, #4, #10)

#### Critical Architecture Issue: State Isolation

**Solution A: React Context Provider (Recommended)**
```typescript
// Create ChatProvider.tsx
const ChatContext = createContext<ChatState | null>(null);

export function ChatProvider({ children }) {
  const chatState = useChatStateInternal(); // Single instance
  return (
    <ChatContext.Provider value={chatState}>
      {children}
    </ChatContext.Provider>
  );
}

// Update useChatState hook
export function useChatState() {
  const context = useContext(ChatContext);
  if (!context) throw new Error('Must use within ChatProvider');
  return context;
}
```
- **Implementation**: Wrap ChatPanel with ChatProvider
- **Pros**: Minimal changes, preserves event-driven architecture
- **Cons**: Requires updating all chat components

**Solution B: Zustand State Store**
- Replace custom reducer with Zustand store
- Global state accessible from any component
- **Pros**: Simpler state management, built-in devtools
- **Cons**: New dependency, different mental model

**Solution C: Event Bus Enhancement**
- Keep separate states but sync via EventBus
- Emit state changes as events
- **Pros**: Maintains current architecture
- **Cons**: Complex synchronization, potential race conditions

### 3. Tile Interaction Fixes (Bugs #5-7)

#### Bug #5: Scale 1 Expansion

**Solution A: Honor canExpand State (Recommended)**
```typescript
// In TileActionsContext.tsx
handleDoubleClick: useCallback(() => {
  if (canExpand) {
    onExpandClick();
  }
}, [canExpand, onExpandClick]);
```
- **Pros**: Simple fix, respects existing logic
- **Cons**: None

**Solution B: Scale Check in Handler**
- Add scale check directly in expansion handler
- **Pros**: Centralized logic
- **Cons**: Duplicates existing canExpand logic

#### Bug #6: Scale 1 Text Truncation

**Solution A: Conditional Truncation (Recommended)**
```typescript
// In content.tsx
const textClasses = cn(
  'font-medium',
  scale === 1 && 'truncate', // Add truncation for scale 1
  scale === 2 && 'text-sm',
  scale === 1 && 'text-xs'
);
```
- **Pros**: Simple, preserves multi-line for larger scales
- **Cons**: Single-line limitation for scale 1

**Solution B: Dynamic Line Clamping**
- Use CSS line-clamp based on scale
- **Pros**: Allows partial multi-line
- **Cons**: Browser support considerations

#### Bug #7: Text Selection

**Solution A: Disable Selection (Recommended)**
```typescript
// In tile components
className={cn(existingClasses, 'select-none')}
```
- **Pros**: Simple, prevents selection issues
- **Cons**: Can't select tile text (minor UX tradeoff)

**Solution B: Smart Selection**
- Allow selection only within tile boundaries
- Prevent selection on double-click
- **Pros**: Preserves text selection ability
- **Cons**: Complex implementation

### 4. UI Polish (Bugs #8-9)

#### Bug #8: Widget Spacing

**Solution A: Consistent Spacing (Recommended)**
```typescript
// In UnifiedTimeline.tsx
<div className="my-2"> {/* Changed from my-0.5 */}
  <Widget />
</div>
```
- **Pros**: Simple fix, consistent with message spacing
- **Cons**: None

**Solution B: Configurable Spacing**
- Add spacing prop to widget wrapper
- **Pros**: Flexible per-widget spacing
- **Cons**: Over-engineering for simple issue

#### Bug #9: Loading Indicator

**Solution A: Loading State in UserProfileTile (Recommended)**
```typescript
const [isLoading, setIsLoading] = useState(false);

const handleClick = async () => {
  setIsLoading(true);
  try {
    const userMap = await trpcUtils.map.user.getUserMap.fetch();
    // ... navigation logic
  } finally {
    setIsLoading(false);
  }
};

// In render
{isLoading && <Loader2 className="animate-spin" />}
```
- **Pros**: Clear user feedback, uses existing LoadingWidget pattern
- **Cons**: Local state management

**Solution B: Event-Driven Loading**
- Emit loading events from navigation handler
- Listen in UserProfileTile
- **Pros**: Consistent with architecture
- **Cons**: More complex for simple loading state

### 5. Implementation Strategy

#### Phase 1: Critical Fixes (Immediate)
1. **Chat System** - Implement ChatProvider (Solution A)
2. **Theme Flicker** - Add inline script (Solution A)
3. **Scale 1 Expansion** - Honor canExpand state (Solution A)

#### Phase 2: Functionality (Day 1-2)
4. **Home Redirect** - Direct redirect (Solution A)
5. **Text Selection** - Add select-none class (Solution A)
6. **Scale 1 Truncation** - Conditional truncation (Solution A)

#### Phase 3: Polish (Day 2-3)
7. **Widget Spacing** - Update to my-2 (Solution A)
8. **Loading Indicator** - Add to UserProfileTile (Solution A)

### 6. Testing Strategy

1. **Integration Tests for Chat**
   - Test actual message flow between components
   - Verify command processing
   - Test login flow

2. **E2E Tests**
   - Theme persistence across reloads
   - Tile interaction behaviors
   - Loading states

3. **Visual Regression Tests**
   - Widget spacing consistency
   - Text truncation at different scales
   - Theme switching without flicker

### 7. Recommended Approach

Based on the analysis, I recommend implementing the "Solution A" options for each bug:

1. **Highest Priority**: Fix chat with ChatProvider - it's completely broken
2. **Quick Wins**: Theme flicker, scale 1 expansion, text selection - simple fixes
3. **Polish Items**: Spacing and loading indicators - improve UX

This approach:
- Minimizes architectural changes
- Fixes critical issues first
- Can be implemented incrementally
- Maintains consistency with existing patterns
- Provides immediate user value

Total estimated effort: 2-3 days for all fixes with proper testing.