# Feature Plan: Auto Base HexSize correction

## 1. Problem Statement

When expanding the map, we get to a point where we have to scroll to the different parts of the map.

## 2. Context

The page responsible to expose the interface for HexMap display and interaction is the /map/[id]/page.tsx. Pages are implemented by seggregating UI components and state components. The state part is already implemented and lives in src/app/map/[id]/state.ts. The items display is also implemented through the src/app/map/[id]/HexBoard. Last the tile are implemented in src/app/map/[id]/tile.tsx.

## 3. High-Level Goal

1. The base size should be defined dynamically in the state instead of being defined as a constant in the HexCoordSystem.
2. Expanding the map should reduce the base size enough to display more items without the need to scroll.
3. Collapsing the map should also augment the base size.
4. The larger a Tile is, the more information we display (just the color for the smaller tiles, then the title, then the title and description)

## 4. Implementation

### Step 1: Modify HexCoordSystem to use dynamic size

We need to modify the HexCoordSystem to allow a dynamic base size rather than a fixed constant.

1. Add a baseSize parameter to HexCoordSystem.getHexSize() to make it configurable
2. Update all references to use the dynamically provided size

### Step 2: Update state management

Modify the useHexMapViewState hook to:

1. Add baseHexSize to the state object
2. Set a reasonable default value (e.g., 200)
3. Create methods to get and update the base hex size
4. Add the baseHexSize to the return data object
5. When scaling up the center, automatically change the base hex size (/2)
6. When scaling down the center, automatically change the base hex size (\*2)

### Step 3: Create a controller for the BaseHexSize

1. Create a component that displayvertically layed out a "+", the BaseHexSize number and a "-".
2. The component float on the bottom right part of the screen.
3. Clicking the "+" augment the baseHexSize (250 max)
4. Clicking the "-" reduce the baseHexSize (10 min)
5. Creating shortucts to zoom in and out

- Bind ctrl + middle mouse button rolling down to the "-" button
- Bind ctrl + "-" to the "-" button
- Bind ctrl + middle mouse button rolling up to the "+" button
- Bind ctrl + "+" to the "+" button

### Step 4: Add responsive content display

Update the Tile and TileContent components to:

1. Calculate the effective size of each tile (baseHexSize × scale)
2. Display different levels of information based on the effective size:
   - all tiles: just color
   - after a medium threshold: color and title
   - after a large threshold: color, title, and description
3. Adjust text sizes based on tile dimensions

### Step 5: Update HexBoard and page component

1. Pass the baseHexSize from state to the HexBoard component
2. Ensure all components properly use the dynamic baseHexSize

### Step 6: When clicking on a tile center the view on this tile
