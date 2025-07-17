# Issue: Multiple UI/UX Bugs in Current Version

**Date**: 2025-07-17
**Status**: Open
**Tags**: #bug #navigation #theme #chat #tiles #ui #high
**GitHub Issue**: #14
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