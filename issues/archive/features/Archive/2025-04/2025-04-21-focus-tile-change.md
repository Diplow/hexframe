# Feature Plan: Tile selection/focus rework

## 1. Problem Statement

The FocusViewTile is not consistent with the rest of the UX and the maximum zoom is arbitrary and can be larger than the screen.

## 2. Context

The page responsible to expose the interface for HexMap display and interaction is the /map/[id]/page.tsx. Pages are implemented by seggregating UI components and state components. The state part is already implemented and lives in src/app/map/[id]/state.ts. The items display is also implemented through the src/app/map/[id]/HexBoard. Last the tile are implemented in src/app/map/[id]/tile.tsx.

## 3. High-Level Goal

1. The base maximum size should depend on the screen size and be defined dynamically by the state.
2. Selecting a tile should "zoom" on this tile until it is the maximum size (until it occupies the full screen either vertically or horizontally). This max zoom state will be called "focus state".
3. Being in focus state disable scrolling but enable inline editing (or creating for empty tiles). Add a button to leave the focus state (and bind ctrl + "-" to it)
4. Leaving the focus state will set the base hex size to what it was before the click that triggered the focus state.

## 4. Implementation

### Step 1: Extend State Management for Focus Mode

1. Add focus mode state to the `useHexMapViewState` hook in `src/app/map/[id]/state.ts`:
   - Add `inFocusMode` boolean flag
   - Add `prevBaseHexSize` to store the previous size before focus mode
   - Create `enterFocusMode` and `exitFocusMode` functions
   - Add `calculateMaxHexSize` function that dynamically determines the max size based on viewport dimensions

### Step 2: Enhance Tile Component

1. Update the `Tile` component in `src/app/map/[id]/Tile/index.tsx`:
   - Add `enterFocusMode` prop for triggering focus mode
   - Add double-click handler to enter focus mode
   - Pass `inFocusMode` flag to control behavior

### Step 3: Create Focus Mode Container

1. Create a new `FocusModeTileContainer` component in `src/app/map/[id]/FocusModeTileContainer.tsx`:
   - Handle keyboard shortcuts (Ctrl+-) for exiting focus mode
   - Prevent scrolling when in focus mode
   - Conditionally render the inline editing interface

### Step 4: Update FocusedTileView Component

1. Modify `FocusedTileView` in `src/app/map/[id]/Tile/FocusedTileView.tsx`:
   - Add support for focus mode UI
   - Add "Exit Focus" button
   - Handle keyboard shortcuts

### Step 5: Update HexBoard Component

1. Update `HexBoard` in `src/app/map/[id]/HexBoard/index.tsx`:
   - Pass focus mode state and handlers to all child Tiles
   - Update to pass selection state for highlighting

### Step 6: Update Map Page Component

1. Modify the main page component in `src/app/map/[id]/page.tsx`:
   - Integrate focus mode container
   - Update HexBoard props to pass focus mode handlers
   - Hide base hex size controller when in focus mode
   - Disable page scrolling when in focus mode

## 5. Testing Plan

1. Test dynamic sizing:

   - Verify maximum hex size calculation works on different screen sizes
   - Check that tiles scale appropriately when entering focus mode

2. Test focus mode interaction:

   - Double-click on a tile to enter focus mode
   - Verify focus mode visually highlights the selected tile
   - Check that scrolling is disabled in focus mode

3. Test inline editing:

   - Verify inline editing works for existing tiles in focus mode
   - Test creating new tiles for empty coordinates in focus mode

4. Test exiting focus mode:
   - Click the exit button
   - Use Ctrl+- keyboard shortcut
   - Verify the hex size returns to previous state

## 6. Acceptance Criteria

- [ ] Maximum tile size is dynamically calculated based on viewport dimensions
- [ ] Double-clicking a tile enters focus mode with appropriate scaling
- [ ] Focus mode prevents page scrolling
- [ ] Inline editing/creation is enabled in focus mode
- [ ] "Exit Focus" button and Ctrl+- shortcut exit focus mode
- [ ] Base hex size returns to previous state after exiting focus mode
- [ ] UI is consistent and intuitive throughout the focus/unfocus transitions
