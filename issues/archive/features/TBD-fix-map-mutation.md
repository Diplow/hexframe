# Feature plan: Allow navigation to whatever MapItem

## Problem

- Can't edit map or create map items for now.
-

## Context

README.md : a general presentation of the project
src/app/map/[id]/README.md : a general presentation of the main front page for the project

## High Level Goal

1. Remove controls for the minimap and the scale and all related codes (including the focus param in the querystring)
2. Take advantage of next15 to load an initial page server side and then hydrate the client with cached data. Synchronize with the server in the background.
3. Create a flow to add new mapItem on our own map.

## Implementation Plan

1. **Phase 1: removing outdated controls**
2. **Phase 2: implementing a map-cache and a dynamic MapCanvas that feeds on that cache**
3. **Phase 3: implementing a view to create a new mapItem**
4. **Phase 4: implementing a view to move a mapItem or swap 2 mapItems**
5. **Phase 5: implementing a view to update a mapItem**
6. **Phase 6: implementing a view to delete a mapItem**
