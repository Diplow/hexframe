# Feature plan: fix the item content layout

## Problem

The item tile is ugly, and should look good whatever description and title size it has. And it should not go beyond the limit of the hexagon.

## Context

src/app/map/[id]/Tile/base.static.tsx: the hexagonal Layout
src/app/map/[id]/Tile/content.tsx: the child component displaying the data inside the hexagon
src/app/map/[id]/Tile/item.static.tsx: the hexagonal Tile component that compose the hexagonal layout and its content, and "hydrate" them.
src/app/map/[id]/Tile/item.static.stories.tsx: the stories to visualize and test the hexagonal Tile component

## High Level Goals

1. Use tailwind classes to lay out title, description and url correctly whatever their size

   - you can wrap words if needed
   - you can slice content if needed
   - only display title from scale 1 and more
   - only display url and description on scale 3
   - adjust font size based on scale
     - scale 1 font size should be text-xs
     - scale 3 should render a 500 characters description, a 150 characters title and a 50 characters url occupying the whole hexagon tile with decent spacing without scroll

2. Make it accessible

   - respect contrast best practices
   - follow aria authoring practice
   - make hovering a tile noticable
   - when on focus, ctrl+shift+T should open the url on a new tab

3. Update item.static.stories.tsx to illustrate evoked constraints
