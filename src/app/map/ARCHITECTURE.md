# Architecture: Map Page

## Overview
See [README.md](./README.md) for why this subsystem exists.

## Internal Structure

```
map/
├── interface.ts       # Public API (N/A - page component)
├── dependencies.json  # Allowed imports
├── page.tsx          # Next.js page entry point
├── layout.tsx        # Page layout wrapper
├── error.tsx         # Error boundary
├── not-found.tsx     # 404 handler
├── constants.ts      # Shared constants
├── TESTING.md        # Testing documentation
│
├── _components/      # Page-specific components
│   ├── MapPageContent.tsx  # Main content orchestrator
│   └── MapContent.tsx      # Layout composition
│
├── _hooks/           # Page-specific hooks
│   ├── use-map-id-resolution.ts
│   └── use-tile-select-for-chat.ts
│
├── types/            # Shared type definitions
│   ├── tile-data.ts
│   ├── url-info.ts
│   ├── events.ts
│   └── theme-colors.ts
│
├── Services/         # Cross-cutting services
│   ├── EventBus/    # Event coordination system
│   └── PreFetch/    # SSR data pre-fetching
│
├── Canvas/          # Tile rendering subsystem
│   └── (see Canvas/ARCHITECTURE.md)
│
├── Cache/           # Data management subsystem
│   └── (see Cache/ARCHITECTURE.md)
│
├── Chat/            # Conversational UI subsystem
│   └── (see Chat/ARCHITECTURE.md)
│
└── Hierarchy/       # Navigation breadcrumb subsystem
    └── (see Hierarchy/ARCHITECTURE.md)
```

## Key Patterns

### Provider Hierarchy
The page sets up a specific provider nesting order:
1. **EventBusProvider** - Foundation for all communication
2. **MapCacheProvider** - Data layer with EventBus dependency
3. **TileActionsProvider** - Tile interaction context
4. Individual subsystem providers as needed

### URL-Driven State
- Center coordinate in URL (`?center=`)
- Scale parameter (`?scale=`)
- Expanded items (`?expandedItems=`)
- Focus state (`?focus=`)

### Data Resolution Flow
1. Page checks for `center` parameter
2. If missing, fetches user's default map
3. Resolves map ID to coordinate system
4. Initializes Cache with resolved data
5. Renders content once data is available

### Server-Side Optimization
- Pre-fetch service for initial data
- Clears pre-fetched data after client hydration
- Background refresh for cache staleness

## Dependencies

| Dependency | Purpose |
|------------|---------|
| next/navigation | Routing and URL management |
| ~/commons/trpc/react | API data fetching |
| ./Cache/interface | Data management provider |
| ./Canvas | Tile rendering components |
| ./Chat/ChatPanel | Chat UI component |
| ./Hierarchy | Navigation breadcrumbs |
| ./Services/EventBus | Event coordination |
| ./Services/PreFetch | SSR optimization |
| ./types/* | Shared type definitions |
| react | React hooks and components |

## Component Responsibilities

### page.tsx
- URL parameter processing
- User map resolution
- Provider setup
- Initial data fetching
- Loading/error states

### MapPageContent.tsx
- Layout composition
- Subsystem coordination
- Event handler setup
- Navigation callbacks

### MapContent.tsx
- Visual layout structure
- Responsive design
- Component positioning

## Interactions

### Inbound (Who uses this page)
- **Next.js Router** → Renders page at `/map` route
- **User Navigation** → Direct URL access or app navigation

### Outbound (What this page uses)
- **TRPC API** ← For user map data
- **Cache** ← For tile data management
- **Canvas** ← For tile rendering
- **Chat** ← For conversational interface
- **Hierarchy** ← For navigation display
- **EventBus** ← For inter-subsystem communication

## Data Flow

```
URL Parameters → page.tsx → MapIdResolution → MapCacheProvider
                    ↓
              MapPageContent → Canvas/Chat/Hierarchy
                    ↑
                EventBus (coordination)
```

## Configuration

### Cache Settings
```typescript
{
  maxAge: 300000,                    // 5 minutes
  backgroundRefreshInterval: 30000,  // 30 seconds
  enableOptimisticUpdates: true,
  maxDepth: 3                       // Hierarchical loading depth
}
```

## TO BE IMPROVED
- The `_components` folder has minimal organization
- Hook naming could be more consistent
- Some configuration is duplicated between files
- Pre-fetch service integration could be cleaner
- Error boundary could provide better recovery options