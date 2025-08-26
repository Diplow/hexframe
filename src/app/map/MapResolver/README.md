# MapResolver

**Purpose**: Resolves map identifiers (database IDs or coordinates) to actual coordinates with optimized caching.

## Why this subsystem exists

The login flow had excessive re-renders due to resolution logic being tightly coupled to other subsystems. MapResolver isolates this responsibility to:

1. **Prevent cascading re-renders** - Memoized resolution results
2. **Single source of truth** - Centralized resolution logic  
3. **Better testability** - Isolated resolution concerns
4. **Performance optimization** - Built-in caching layer

## Public API

```typescript
// Provider for resolution context
<MapResolverProvider>

// Hook for resolution operations
const { resolvedInfo, isResolving, error } = useMapResolver(centerParam)

// Types
type ResolvedMapInfo = {
  centerCoordinate: string;
  userId: number;
  groupId: number; 
  rootItemId: number;
  isLoading: boolean;
  error: Error | null;
}
```

## Usage

```typescript
// In page.tsx
import { MapResolverProvider, useMapResolver } from './MapResolver/interface'

function MapPage() {
  return (
    <MapResolverProvider>
      <MapContent />
    </MapResolverProvider>
  )
}

function MapContent() {
  const { resolvedInfo } = useMapResolver(params.center)
  return <MapCacheProvider initialCenter={resolvedInfo.centerCoordinate} />
}
```

## Performance Characteristics

- **Resolution caching**: Same ID resolution cached indefinitely
- **Memoized results**: Prevents unnecessary re-renders
- **Single TRPC query**: Optimized for minimal network calls
- **Expected renders**: 1-2 per unique resolution request