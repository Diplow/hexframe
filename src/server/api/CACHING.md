# HexMap Caching Strategies

This document outlines caching strategies for our HexMap application, focusing on the Backend-for-Frontend (BFF) pattern with React Server Components and tRPC.

## Caching Architecture Options

### 1. tRPC Middleware Caching (Recommended)

Implement caching logic directly in tRPC middleware for type-safe, procedure-specific caching.

```typescript
// lib/trpc/middleware/caching.ts
import { middleware } from "@trpc/server";
import { cache } from "~/lib/cache";

export const cacheMiddleware = middleware(
  async ({ path, type, next, rawInput }) => {
    // Only cache queries, not mutations
    if (type !== "query") return next();

    // Generate cache key from procedure path and input
    const inputHash = JSON.stringify(rawInput);
    const cacheKey = `trpc:${path}:${inputHash}`;

    // Check cache first
    const cached = await cache.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Execute procedure if not cached
    const result = await next();

    // Cache the result (with TTL based on procedure)
    const ttl = getCacheTTL(path); // Custom function to determine TTL
    await cache.set(cacheKey, JSON.stringify(result), ttl);

    return result;
  },
);

// Apply to specific procedures
export const hexMapRouter = router({
  getRegion: publicProcedure
    .use(cacheMiddleware)
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      return db.hexRegion.findUnique({ where: { id: input.id } });
    }),
});
```

**Advantages**:

- Centralized cache logic
- Type-safe caching
- Selective application to specific procedures
- Transparent to consumers
- Works with both server and client components

### 2. Route Handler with Caching

Create dedicated API routes that handle caching before calling tRPC.

```typescript
// app/api/hexmap/[regionId]/route.ts
import { NextResponse } from "next/server";
import { serverTrpc } from "~/trpc/server";
import { cache } from "~/lib/cache";

export async function GET(
  request: Request,
  { params }: { params: { regionId: string } },
) {
  const cacheKey = `hexmap:region:${params.regionId}`;

  // Try to get from cache
  const cached = await cache.get(cacheKey);
  if (cached) return NextResponse.json(JSON.parse(cached));

  // Fetch from tRPC if not cached
  const data = await serverTrpc.hexMap.getRegion({ id: params.regionId });

  // Cache the result (e.g., for 5 minutes)
  await cache.set(cacheKey, JSON.stringify(data), 60 * 5);

  return NextResponse.json(data);
}
```

## Cache Implementation Options

1. **Redis** (recommended for production)

   ```bash
   npm install ioredis
   ```

2. **Node-Cache** (simpler, in-memory)

   ```bash
   npm install node-cache
   ```

3. **Vercel KV** (if using Vercel platform)

## Cache Invalidation Strategies

```typescript
// When data changes through mutations
export async function invalidateRegionCache(regionId: string) {
  await cache.del(`hexmap:region:${regionId}`);
}

// In your tRPC mutation
export const appRouter = router({
  hexMap: router({
    updateTile: protectedProcedure
      .input(updateTileSchema)
      .mutation(async ({ input, ctx }) => {
        // Update database
        const result = await ctx.db.tile.update(/*...*/);

        // Invalidate cache
        await invalidateRegionCache(result.regionId);

        return result;
      }),
  }),
});
```

## Server Components with Caching

The caching strategy complements React Server Components:

```tsx
// Server Component using cached tRPC call
async function HexMapRegion({ regionId }) {
  // This calls the cached tRPC procedure
  const tiles = await serverTrpc.hexMap.getRegion({ id: regionId });
  return <HexMapRenderer tiles={tiles} />;
}
```

## Client-Side Integration with Server Rendering

Two approaches for integrating server-rendered content with client state:

### 1. Client Component with State Hydration

```tsx
// Server Component
async function HexMapRegion({ regionId }) {
  const mapItems = await serverTrpc.hexMap.getRegion({ id: regionId });
  return <ClientHexMapWithStore initialMapItems={mapItems} />;
}

// Client Component
("use client");
function ClientHexMapWithStore({ initialMapItems }) {
  useEffect(() => {
    if (initialMapItems) {
      dispatch({ type: "ADD_MAP_ITEMS", payload: initialMapItems });
    }
  }, [initialMapItems]);

  return <YourClientSideMapComponent />;
}
```

### 2. Server Rendering with Dedicated Hydration Component

```tsx
// Server Component
async function HexMapRegion({ regionId }) {
  const mapItems = await serverTrpc.hexMap.getRegion({ id: regionId });

  return (
    <>
      <ServerRenderedMap items={mapItems} />
      <ClientStoreHydrator data={mapItems} />
    </>
  );
}

// Client Component
("use client");
function ClientStoreHydrator({ data }) {
  useEffect(() => {
    globalStore.dispatch({ type: "HYDRATE_MAP_REGION", payload: data });
  }, [data]);

  return null;
}
```

## Loading States for Server Components

Use React Suspense to show loading indicators:

```jsx
"use client";
import { Suspense } from "react";
import ServerHexMap from "./ServerHexMap";

export default function MapContainer() {
  return (
    <div>
      <Suspense fallback={<div className="spinner">Loading map...</div>}>
        <ServerHexMap />
      </Suspense>
    </div>
  );
}
```

## Performance Considerations

- Server rendering with caching is optimal for:

  - Large/complex map regions
  - Low-powered devices
  - Poor network conditions
  - Maps with complex visual elements

- Consider client rendering for:
  - Highly interactive maps with frequent updates
  - Maps that require extensive client-side state management
