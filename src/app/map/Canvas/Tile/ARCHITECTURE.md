# Architecture: Tile

## Overview
See [README.md](./README.md) for why this subsystem exists.

## Internal Structure

```
Tile/
├── interface.ts          # Public API
├── dependencies.json     # Allowed imports  
├── Base/                # Static components (no interactivity)
│   ├── BaseTileLayout.tsx   # Core hexagonal rendering
│   ├── BaseFrame.tsx        # Static hexagonal layout
│   ├── BaseItemTile.tsx     # Static item tile
│   └── BaseEmptyTile.tsx    # Static empty tile
├── Item/                # Dynamic item tiles
│   ├── item.tsx             # Main item tile component
│   ├── _components/         # Item tile internals
│   ├── _hooks/             # Item tile hooks
│   └── _utils/             # Item utilities
├── Empty/               # Dynamic empty tiles  
├── Auth/                # Authentication tiles
├── Error/               # Error state tiles
├── Welcome/             # Welcome tiles
└── utils/               # Shared tile utilities
```

## Key Patterns
- **Base vs Dynamic**: Base components for static rendering, Dynamic for interactivity
- **Internal organization**: Each tile type has its own folder with internal structure
- **Shared utilities**: Common functionality in utils/

## Dependencies

| Dependency | Purpose |
|------------|---------|
| React | Component framework |
| Canvas types | Tile scale, color, and layout types |
| Domain utilities | Hex coordinate calculations |

## Interactions

### Inbound (Who uses this subsystem)
- **Canvas** → Uses all tile components for map rendering
- **External systems** → Use Base components for static tile display
- **Storybook** → Uses components for documentation

### Outbound (What this subsystem uses)  
- **Domain utilities** ← For coordinate system calculations
- **Theme system** ← For visual styling