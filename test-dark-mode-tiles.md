# Dark Mode Tile Gradient Test

## What was fixed

The issue was that the `isDarkMode` prop existed on the `DynamicBaseTileLayout` component but wasn't being passed down through the component hierarchy. The tiles were always rendering with light mode gradients even when dark mode was enabled.

## Changes made

1. **Added dark mode detection to all tile components:**
   - `ItemTileContent` - for regular item tiles
   - `DynamicFrame` - for expanded frames
   - `DynamicEmptyTile` - for empty tiles
   - `AuthTile` - for authentication tiles
   - `ErrorTile` - for error tiles
   - `WelcomeTile` - for welcome tiles

2. **Dark mode detection method:**
   - Uses `useEffect` to detect if the `dark` class is present on the document element
   - Sets up a `MutationObserver` to watch for changes to the class attribute
   - Automatically updates when the theme toggles

3. **How the gradient works:**
   - In light mode: gradient uses white (255,255,255) to black (0,0,0)
   - In dark mode: gradient uses black (0,0,0) to white (255,255,255)
   - This creates the proper faceted effect for tiles in both themes

## Testing

1. Navigate to http://localhost:3002/map
2. Toggle between light and dark modes using the theme toggle
3. Observe that:
   - In light mode: tiles have a subtle white-to-black gradient overlay
   - In dark mode: tiles have a subtle black-to-white gradient overlay
   - The gradient direction changes based on tile position (for child tiles)
   - Expanded tiles show a radial gradient from the center

## Files modified

- `/src/app/map/Tile/Item/_components/item-tile-content.tsx`
- `/src/app/map/Canvas/frame.tsx`
- `/src/app/map/Tile/Empty/empty.tsx`
- `/src/app/map/Tile/Auth/auth.tsx`
- `/src/app/map/Tile/Error/error.tsx`
- `/src/app/map/Tile/Welcome/welcome.tsx`

The fix ensures that all tiles properly detect the current theme and pass the `isDarkMode` prop to the `DynamicBaseTileLayout` component, which then renders the appropriate gradient overlay.