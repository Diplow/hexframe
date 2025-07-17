# Future Ideas for Hexframe

This document captures future design directions and features that aren't part of the current implementation but represent the evolving vision for Hexframe.

## Canvas Enhancements

### Depth & Context
- Show neighbors/parent as partial scale-3 tiles extending off-screen
- Creates visual depth and imbalance (more dynamic)
- Enables direct neighbor navigation
- Rotation animation when moving to neighbors

### Tile States
**Pushed/Released interaction**
- Visual state change when "pushed" (dimmed? checkmark?)
- Progressive exploration: push tiles as you understand them
- Practice tracking: push steps as you complete them
- Persistent across sessions
- Different from selection - about progress, not targeting

**Use cases:**
- Learning systems: "I've internalized this concept"
- Practice systems: "I've completed this step"
- Reading systems: "I've processed this section"
- Could reset for new practice sessions

## Hierarchy Evolution

### Navigation Hub
- Hexframe logo tile (navigate to platform features)
- User profile tile (always return home)
- Current path hierarchy
- Navigation animations to show movement

## Toolbox Simplification

### Context-Aware Actions
- Create: Only on empty tiles
- Navigate: Double-click or Ctrl+click
- Expand/Collapse: Single click
- Reduces mode switching, more intuitive

## New Components

### Preview
**Tile inspector without navigation**
- View full description/content
- See all metadata (author, dates, stats)
- Check children without navigating
- Possibly a side panel or modal
- Solves information density without hover issues

### Chat
**AI embodiment of systems**
- AI adopts the worldview of current system
- "How would this system help you?"
- Challenge mode: AI questions your assumptions
- Action mode: "Create a child tile about X"
- System collaboration: Multiple AI systems discussing

**Potential uses:**
- System exploration through conversation
- Testing if system is well-defined (can AI embody it?)
- Discovering blind spots in your thinking
- Orchestrating AI tool systems

## Interaction Models

### Selection Model
**Question: Should tiles be selectable?**

**What selection would enable:**
- Clear action target (which tile to edit/delete/move)
- Keyboard navigation (arrow keys between tiles)
- Preview panel context (show details of selected tile)
- Multi-select for batch operations
- Visual feedback before navigation

**Design tension:**
- Navigation-first vs. selection-first interaction
- Click to navigate vs. click to select
- How to handle touch interfaces

**Possible approach:**
- Single click = select
- Double click = navigate
- Selected state shows available actions
- Escape key to deselect

## Open Questions for Future

1. How can AI embody systems? What makes a system "AI-ready"?
2. Should pushed/released states sync across users viewing the same system?
3. How do collaborative features work while maintaining individual practice?
4. What's the relationship between selection, pushing, and navigation?