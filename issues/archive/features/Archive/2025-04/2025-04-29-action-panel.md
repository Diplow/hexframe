# Feature plan: an Action Panel

## Problem

There are a lot of actions that are possible but one can hardly discover them: collapse, expand, deep expand, edit, delete, create...

## Context

- Next15 application
- src/app/map/[id]/page.tsx
- src/app/map/[id]/State/\*.ts -> state for the map page
- src/app/map/[id]/Canvas/index.tsx -> The layout for tiles
- src/app/map/[id]/Canvas/State/index.ts -> state for the canvas (most of the state is here)
- src/app/map/[id]/Tile/index.tsx -> The tile component
- src/app/map/[id]/Controls/\*.tsx -> Controls that change how you navigate or interact with the map

## High Level Goals

Create a vertical toolbox on the left of the screen that float on top of the map. The toolbox offer these functionalities:

1. select: the default mode. Clicking a tile in this mode select it
2. expand/collapse: when in this mode, clicking a tile expand it or collapse it if possible.
3. Deep expand: when in this mode, clicking a tile deep expand it.
4. Create/update: when in this mode, clicking a tile edit it or create a new one at the selected coordinates if it is an empty tile
5. Delete: when in this mode, clicking a tile delete it.
6. Lock: when in this mode, disable drag and drop and edition

## Detailed implementation

Make the toolbox available in 3 format:

- collapsed: can't view any tool nor text
- shortcuts: can only view an icon (pushed if using this tool), on hover on the tool icon you see the name of the tool and the shortcut to use it with a keyboard
- full: display the full tool name besides the icon. Hovering the toolname and/or icon display the shortcut to use it with a keyboard
