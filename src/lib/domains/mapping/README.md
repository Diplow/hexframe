# Mapping Domain

## Why This Exists
The Mapping domain manages the core hexagonal map system that is the heart of Hexframe. It handles all operations related to creating, organizing, and navigating through hexagonal maps where users build their living systems.

## Mental Model
A hexagonal coordinate system where every item has exactly six neighbors, creating spatially meaningful relationships between ideas, notes, and content.

## Core Responsibility
This domain owns:
- Hexagonal map creation and management
- Item placement and movement within maps
- Parent-child hierarchical relationships
- Neighbor relationships in hexagonal space
- Item swapping and reorganization
- Map permissions and sharing

This domain does NOT own:
- User authentication (delegated to IAM domain)
- AI/chat interactions (delegated to Agentic domain)
- UI rendering logic (delegated to app layer)
- Real-time synchronization (delegated to infrastructure)

## Public API
See `interface.ts` for the public API. Main capabilities:
- `MappingService` - Orchestrator service for all mapping operations
- `MapItem` - Domain entity for items on the map
- `BaseItem` - Domain entity for base content
- Server actions for map operations
- Hexagonal coordinate utilities

## Dependencies
See `dependencies.json` for allowed imports.

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for structure details.