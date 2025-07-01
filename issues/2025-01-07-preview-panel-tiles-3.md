# Issue: Preview Panel for Tile Content

**Date**: 2025-01-07
**Status**: Open
**Tags**: #feature #design #tiles #high
**GitHub Issue**: #65
**Branch**: issue-3-preview-panel-tiles

## Problem Statement
We need a preview panel to read the content of the tiles. Then we can simplify the data display on tiles (just the title) and just display a markdown preview in the preview panel. We will later use this panel for more than just the preview but this is the start. The preview will take as much place as possible, while the toolbox, the map canvas and the hierarchy tiles will occupy the rest of the screen.

## User Impact
- Users cannot easily read tile content without clicking into each tile
- Current tile display may be cluttered with too much information
- No dedicated space for viewing detailed content while navigating the map
- Users need better separation between navigation (map) and content consumption (preview)

## Expected Behavior
1. Tiles show simplified display with just the title
2. Selecting a tile shows its content in a dedicated preview panel
3. Preview panel displays markdown content rendered properly
4. Preview panel takes as much screen space as possible
5. Toolbox, map canvas, and hierarchy tiles occupy the remaining screen space
6. Layout adjusts responsively to accommodate the preview panel

## Current Behavior
- Tiles display content directly on the tile surface
- No dedicated preview area for reading content
- Limited space on tiles for displaying full content

## Environment
- Component: Map view interface
- User role: All users navigating tile maps
- Frequency: Core feature - used constantly during map navigation

## Related Issues
- Previous tile display improvements
- Map canvas layout optimizations