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