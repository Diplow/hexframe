# Map Page

## Why This Exists
The Map page is the core user interface of Hexframe, providing an interactive hexagonal map visualization where users can navigate, create, and manage their hierarchical tile systems. It orchestrates all the major subsystems (Canvas, Cache, Chat, Hierarchy) to deliver a cohesive experience for exploring and building knowledge structures.

## Mental Model
Think of this as the main application shell that coordinates multiple specialized subsystems into a unified hexagonal mapping experience.

## Core Responsibility
This page owns:
- Page-level routing and URL parameter management
- Subsystem orchestration and provider setup
- User map resolution and initial data fetching
- Layout composition of major UI components

This page does NOT own:
- Tile rendering (delegated to Canvas)
- Data management (delegated to Cache)
- Chat interactions (delegated to Chat)
- Hierarchy navigation (delegated to Hierarchy)
- Event coordination (delegated to EventBus)

## Public API
This is a Next.js page component - it doesn't expose a traditional API but serves as the entry point for the `/map` route.

## Major Subsystems

### Canvas
Renders the hexagonal tile grid and handles visual interactions.
See `Canvas/README.md` for details.

### Cache
Manages tile data, synchronization, and optimistic updates.
See `Cache/README.md` for details.

### Chat
Provides conversational interface and AI integration.
See `Chat/README.md` for details.

### Hierarchy
Displays parent-child navigation breadcrumbs.
See `Hierarchy/README.md` for details.

### Services
- **EventBus**: Centralized event system for subsystem communication
- **PreFetch**: Server-side data pre-fetching optimization

## Dependencies
See `dependencies.json` for allowed imports.

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for structure details.