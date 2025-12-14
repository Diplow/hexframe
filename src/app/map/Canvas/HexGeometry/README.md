# Canvas HexGeometry

## Mental Model
HexGeometry is the "math layer" of the Canvas - computing hexagonal tile positions, coordinate relationships, and spatial directions for neighbor tile rendering.

## Responsibilities
- Hexagonal positioning calculations (neighbor tile offsets based on scale)
- Coordinate calculations (sibling and parent coordinate IDs)
- Spatial direction computation (determining where tiles appear relative to center)

## Non-Responsibilities
- Rendering tiles → See parent Canvas and `~/app/map/Canvas/Tile`
- User interactions → See `~/app/map/Canvas/Interactions`
- Coordinate storage → See `~/lib/domains/mapping`

## Interface
See `index.ts` for the public API.
See `dependencies.json` for allowed imports.
