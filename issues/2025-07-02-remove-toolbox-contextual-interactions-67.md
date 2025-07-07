# Issue: Remove toolbox in favor of intuitive contextual interactions

**Date**: 2025-07-02
**Status**: Open
**Tags**: #feature #design #tiles #enhancement #high
**GitHub Issue**: #67
**Branch**: issue-67-remove-toolbox-contextual-interactions

## Problem Statement
The current toolbox adds unnecessary UI complexity and requires users to switch between different modes for common actions. This creates friction in the user experience and makes the interface less intuitive. Users should be able to interact with tiles directly through natural gestures without needing to select specific tools first.

## User Impact
- Users must constantly switch between different tool modes to perform basic actions
- The toolbox takes up screen real estate that could be used for content
- New users face a steeper learning curve with multiple tools to understand
- Common actions require more clicks than necessary

## Proposed Changes

### Direct Interactions
1. **Select Mode (Default)**: Clicking on a tile displays its preview in the chat panel
2. **Expand Mode**: Double-clicking on any tile expands it
3. **Navigation**: Ctrl+click on a tile navigates to it
4. **Create**: Hovering on empty tiles in owned domains shows create option
5. **Edit/Delete**: Available via burger menu in the chat preview
6. **Move**: Drag and drop is always enabled for owned tiles
7. **Context Menu**: Right-click on tiles shows all available actions with keyboard shortcuts

### UI Changes
- Remove the toolbox component entirely
- Move light/dark mode toggle to top right of chat panel
- Show hover effects on empty tiles in owned domains
- Add burger menu to chat previews for edit/delete actions

## Benefits
- More intuitive interface that follows common UI patterns
- Reduced cognitive load for users
- Faster access to common actions
- More screen space for actual content
- Better discoverability through contextual menus

## Environment
- Browser/OS: All
- User role: All users
- Frequency: Always - affects core interaction patterns

## Related Issues
- This would simplify the overall UI architecture
- Reduces the number of components to maintain
- Aligns with modern UI patterns where actions are contextual