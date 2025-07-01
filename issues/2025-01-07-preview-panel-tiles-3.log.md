# Issue #3 Log: Preview Panel for Tile Content

This file documents the complete history and evolution of issue #3.

## 2025-01-07 - Issue Created

*Created by user via /issue command*

### Initial Problem Statement
We need a preview panel to read the content of the tiles. Then we can simplify the data display on tiles (just the title) and just display a markdown preview in the preview panel. We will later use this panel for more than just the preview but this is the start. The preview will take as much place as possible, while the toolbox, the map canvas and the hierarchy tiles will occupy the rest of the screen.

### Initial Tags
#feature #design #tiles #high

---

## 2025-01-07 - Solution Design Added

*Added via /solution command*

### Architecture Analysis

Investigated the current map view architecture:
- Dual-route architecture (dynamic /map and static /static/map)
- Hierarchical component structure: Page → Canvas → Frame → Tile
- Context-based state management with MapCacheProvider, TileActionsProvider
- Current layout: Toolbox (left), Canvas (center), ParentHierarchy (right)
- Tiles render markdown content directly with scale-based display
- Tool-based interaction system for tile actions

### Solution Approaches Evaluated

1. **Resizable Split Panel** - Vertical split with map left, preview right
2. **Overlay Drawer Panel** - Floating panel sliding from right
3. **Bottom Sheet Panel** - Slide-up panel from bottom

### Recommended Solution

Selected **Approach 1: Resizable Split Panel** with progressive enhancement:

**Phase 1**: Basic implementation
- Add PreviewPanel component with markdown rendering
- 60/40 split layout with flexbox
- Selection state in MapCacheProvider
- Simplify tiles to show only titles

**Phase 2**: Enhanced features
- Resizable splitter functionality
- Collapsible panel
- Preview toolbar for future features

**Phase 3**: Mobile optimization
- Adaptive layout switching to overlay on mobile
- Touch gestures and responsive breakpoints

### Technical Decisions

- Extend MapCacheProvider with preview state
- Create new Preview subdirectory for components
- Modify DynamicTileContent for simplified display
- Update main page layout to accommodate split view

### Changes to Issue File
- Added complete Solution section with three approaches
- Included technical implementation details
- Defined phased implementation plan
- Listed specific components and next steps

---

## 2025-01-07 - Evolved to Chat Panel Vision

*Updated via discussion and CHAT.md creation*

### Major Vision Shift

Changed from "Preview Panel" to "Chat Panel" based on deeper understanding of Hexframe's vision:
- Chat is the interface for interacting with systems, not just viewing content
- Systems are living entities users can converse with
- Preview is just the first widget type in a conversational interface

### Key Design Decisions

1. **Chat-First Architecture**
   - Use chat terminology from Phase 1
   - Message-based interface structure
   - Preview as widget, not entire panel

2. **AI Orchestration Vision**
   - Systems compose AI behaviors using Hexframe's own spatial model
   - Orchestrator → Role → Persona hierarchy
   - Self-referential: Hexframe uses itself to power its AI

3. **Progressive Onboarding**
   - Experience system creation through conversation
   - Reveal complexity gradually
   - Show that users are talking to a system

### Technical Updates

- Changed all "Preview" references to "Chat"
- Added message-based state structure
- Prepared for widget system
- Set foundation for future AI integration

### Documentation

Created `/CHAT.md` to capture:
- Design philosophy and vision
- AI orchestration architecture
- Onboarding flow
- Phase 1 implementation details

---

## 2025-01-07 15:30 - Context Analysis

*Added by @ulysse via /context command*

### Investigation Process

1. Read `/context` command documentation
2. Analyzed core architecture documentation:
   - `/src/app/map/ARCHITECTURE.md` - Map application architecture
   - `/src/lib/domains/README.md` - Domain structure
   - `/CHAT.md` - Chat panel vision and design
3. Examined current implementation:
   - Map page layout structure (`page.tsx`)
   - Tile display components (`Tile/Item/`)
   - State management providers (MapCache, TileActions)
   - Tool system and interactions
   - Layout components (Toolbox, ParentHierarchy)
4. Searched for existing chat/preview components (none found)

### Detailed Findings

**Architecture Insights**:
- Map app uses dual-route architecture with static/dynamic separation
- Centralized tile action management avoids hook proliferation
- Provider-based state management with MapCacheProvider at core
- Tool-based interaction system with 6 active tools + hidden 'select' tool
- URL-first state for shareable/bookmarkable features

**Current Layout**:
- Page wrapper with multiple context providers
- Fixed toolbox on left side
- Central canvas for map display
- Parent hierarchy on right side
- No existing panel or chat components

**Tile Display Logic**:
- Scale-based content display (1=title, 2=title+desc, 3=full)
- Markdown rendering with ReactMarkdown
- Hover states for expanded content at scale 2
- Complex truncation and layout logic

**State Management Structure**:
- MapCacheProvider handles all data and navigation
- TileActionsProvider manages tool selection and dispatch
- Both use localStorage for persistence
- Clean separation of concerns

**Integration Points Identified**:
1. Layout needs restructuring in page.tsx for split panel
2. MapCacheProvider needs chat state extension
3. 'select' tool already exists but needs UI integration
4. DynamicTileContent needs simplification
5. New Chat component hierarchy needed

### Synthesis

The codebase is well-structured for adding the chat panel:

1. **Clean Architecture**: Clear separation between layout, state, and display components makes integration straightforward
2. **Existing Patterns**: Provider pattern and centralized dispatch can be extended for chat
3. **Tool System**: Hidden 'select' tool suggests this was anticipated
4. **State Management**: MapCacheProvider is the natural home for chat state
5. **Layout Flexibility**: Current layout can accommodate split panel with minimal changes

Key technical decisions:
- Extend MapCacheProvider rather than create new provider
- Use existing 'select' tool for chat interaction
- Follow established component organization patterns
- Maintain URL-first philosophy for panel state (open/closed)

### Changes Made to Issue File

- Added comprehensive Context section with:
  - Documentation review and accuracy check
  - Domain overview with architectural patterns
  - Detailed component breakdown
  - Implementation details and file organization
  - Dependencies and integration analysis
  - Technical constraints identification
- Positioned before Solution section to inform implementation
- Highlighted key integration points for chat panel

---

## 2025-01-07 - Architecture Corrections

*Updated based on user feedback*

### Key Architectural Changes

1. **Layout Strategy**
   - Chat takes maximum available space (not 60/40 split)
   - Fixed sections: Toolbox (left), ParentHierarchy (right)
   - Minimum width for center canvas (scale 3 tile)
   - Chat panel fills remaining horizontal space

2. **State Management**
   - Separate ChatProvider (not extending MapCacheProvider)
   - MapCacheProvider remains data-only
   - Clear separation of concerns between data and UI state
   - ChatProvider reads from MapCache when needed

3. **Design Constraints**
   - Desktop-only for Phase 1
   - No persistence (messages lost on refresh)
   - Future consideration for mobile layout
   - Future consideration for chat persistence

### Updated Component Hierarchy
```
MapCacheProvider (data only)
└── ChatProvider (separate chat state)
    └── FlexLayout
        ├── Toolbox (fixed)
        ├── Canvas (min-width)
        ├── Hierarchy (fixed)
        └── ChatPanel (flex-1)
```

### Rationale
- Maximum chat space provides better conversation experience
- Separate providers maintain clean architecture
- Desktop-first allows focus on core experience
- No persistence simplifies Phase 1 implementation

---