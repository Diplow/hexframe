# Tile

## Mental Model
Like a set of modular building blocks - provides both static base tiles (like LEGO foundation pieces) and dynamic interactive tiles (like specialized LEGO pieces with moving parts) that can be combined to build the hexagonal map interface.

## Responsibilities
- Exports static base tile components for non-interactive rendering (BaseTileLayout, BaseFrame, BaseItemTile, BaseEmptyTile)
- Exports dynamic tile components that handle user interactions (DynamicItemTile, DynamicEmptyTile)
- Provides tile type definitions and styling interfaces (TileScale, TileColor, TileStroke, TileCursor)
- Exposes utility functions for tile color calculations and styling
- Manages the public API contract for all tile-related components and types

## Non-Responsibilities
- Static tile rendering implementation → See `./Base/README.md`
- Interactive empty tile behavior → See `./Empty/README.md`
- Interactive item tile behavior → See `./Item/README.md`
- Tile utility functions implementation → See `./utils/README.md`
- Drag and drop interaction logic → See parent `../README.md`
- Data persistence and caching → See `../../Cache/README.md`

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.