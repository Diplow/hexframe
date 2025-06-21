# Feature plan: Improve moveItem Mutation

## Problem

When exchanging two mapItems coordinates, we currently need to reload the whole map to update their descendants.

## Context

- the mutation state: src/app/map/[id]/Canvas/State/mutations.ts
- the mutation: moveItemMutation
- the trpc API: src/server/api/routers/map.ts
- the service: src/lib/domains/mapping/services/hex-map.ts

## High Level Goals

1. Implement a new interface getDescendants({ mapId, itemId }) for the hex-map Service that returns all descendants of itemId
2. When moving an item to a new position, reload all descendants of this item (therefor exchanging 2 items reload all descendants for both items).

## Implementation details

1. Implement the getDescendants({ mapId, itemId }) method in the action (src/lib/domains/mapping/\_actions/hex-map.ts)
2. Implement the getDescendants({ mapId, itemId }) method in the service (src/lib/domains/mapping/services/hex-map.ts)
3. Test the getDescendants method of the service (src/lib/domains/mapping/services/**tests**/hex-map.integration.test.ts)
4. Implement the getDescendants method in the router (src/server/api/routers/map.ts)
5. Implement the reloadDescendants method in the mutations state (src/app/map/[id]/Canvas/State/mutations.ts)
