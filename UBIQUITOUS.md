# Ubiquitous Language

A living glossary of terms used in the Hexframe project. This document establishes a shared vocabulary to ensure clear communication between developers, users, and AI systems.

## Core Structure

### Tile

A hexagonal unit representing a single task, information or tool. Like a function in programming, a Tile has a clear name that conveys WHAT it does or WHAT it is about without revealing HOW.

### Frame

The result of expanding a Tile. A Frame consists of one CenterTile surrounded by up to 6 child Tiles, revealing HOW the original Tile accomplishes its purpose.


### Generation

The relative distance from a Frame's center:

- Generation 0: The CenterTile of the current Frame
- Generation 1: Up to 6 direct children of the CenterTile
- Generation 2: All children of Generation 1 tiles
- And so on...

### Descendant

Any Tile that belongs to any Generation (1, 2, 3...) relative to a given Tile. All tiles in a Map except the CenterTile are descendants.

### Map

A view consisting of:

- One CenterTile (the origin)
- All Generations relative to that CenterTile
- Maintains abstraction boundaries (does NOT include internal expansions of CenterTiles)

### System

The complete hierarchical structure including:

- A root Map
- All nested Maps from expanded CenterTiles
- Full transparency without abstraction boundaries

## Spatial Concepts

### Opposite Tiles

Two Tiles positioned at maximum distance from each other in a Frame (e.g., NW ↔ SE). Opposites typically represent tensions, dualities, or complementary aspects.

### Neighbor Tiles

Tiles adjacent to each other in a Frame. Neighbors share natural connections and often collaborate or share context.

### Direction

The seven possible positions around a CenterTile in pointy-top hexagonal layout:

**Subtask Directions (Positive 1-6):**
- 1 = NW (Northwest)
- 2 = NE (Northeast)
- 3 = E (East)
- 4 = SE (Southeast)
- 5 = SW (Southwest)
- 6 = W (West)

**Context Directions (Negative -1 to -6):**
- -1 = ContextNW (Context Northwest)
- -2 = ContextNE (Context Northeast)
- -3 = ContextE (Context East)
- -4 = ContextSE (Context Southeast)
- -5 = ContextSW (Context Southwest)
- -6 = ContextW (Context West)

**Hexplan (Direction 0):**
- 0 = Hexplan (execution state and agent guidance for the parent tile)

Positive directions represent subtask children (decomposed work units). Negative directions represent context children (reference materials, constraints, templates). The negative direction values are a storage implementation detail - UX-wise, context children appear in the same hexagonal positions as subtask children.

Best practice: Use string representations (NW, NE, etc.) in user interfaces and documentation for clarity, while using integers internally for Path calculations.

### Path

An array of direction integers representing a Tile's position in the hierarchy. Examples:
- [1, 2, 3] means: from root, go to NW child, then its NE child, then its E child (all subtasks)
- [1, -3, 4] means: from root, go to NW child, then its ContextE child, then its SE child (mixed subtask and context)
- [1, 0] means: the hexplan tile for the NW subtask

Negative values in the path indicate context children at that level. Direction 0 indicates a hexplan tile.

## Tile Children Types

### Subtask Children (Positive 1-6)

Children that decompose a task into smaller work units. When an agent executes a tile, it processes subtask children as discrete units of work that can be delegated to subagents.

### Context Children (Negative -1 to -6)

Children that provide reference materials, constraints, templates, or other contextual information. Context children are included in the prompt but not executed as separate tasks.

### Hexplan (Direction 0)

A special child that stores execution state and guides agent behavior. The hexplan contains:
- Status of completed, in-progress, and blocked work
- Decisions made and rationale
- Next steps and instructions
- User adjustments to guide execution

Hexplans are the control interface for autonomous execution — users edit hexplans to steer agent behavior rather than chatting back-and-forth. The "hex" prefix distinguishes Hexframe's execution state from generic "plans" that might be created as task outputs.

### Tool Tile

A Tile that wraps a specific capability (LLM, code execution, database access, etc.) with a defined interface of inputs and outputs.

### LLM Tile

A specific type of Tool Tile that provides access to a Large Language Model with configuration (API key, model selection, parameters).

### Information Tile

The most basic and commonly used Tile type, containing a title and description. When used as a context child, provides reference information to the executing agent.

### Prompt Tile

A Tile containing a prompt template with parameters. When composed with an LLM Tool, creates a reusable AI component.

### CollaborativeMap

A pre-designed template Map with:

- Multiple expanded Frames with empty CenterTiles
- Defined communication protocols between adjacent centers
- Awaits composition with LLM Tools to create multi-agent systems

## Actions

### Expand

Transform a Tile into a Frame, revealing its implementation through up to 6 child Tiles. Creates empty children if they don't exist yet.

### Collapse

Hide the children of a Frame, showing only the CenterTile. The children remain preserved for future expansion.

### Navigate

Change the viewing perspective by selecting a different Tile to serve as the Map's center.

## Constraints

### The Rule of 6

Each Frame can have at most 6 child Tiles. This constraint forces prioritization, maintains cognitive load, and ensures visual clarity.

### Abstraction Boundary

The separation between what belongs to the current Map (visible) and what belongs inside CenterTiles (hidden until navigated to).

## Visibility & Access Control

### Tile Visibility

A setting on each tile that controls who can access it:

- **Public** - Visible to everyone, including anonymous users
- **Private** - Visible only to the tile owner (default for new tiles)

Visibility is enforced at the data layer. When viewing someone else's map, only their public tiles are visible. Private tiles are filtered out before data reaches the client.

### Owner

The user who created a tile. The owner always has full access to all their tiles regardless of visibility setting. Ownership is tracked via the tile's `ownerId` field, which matches the `userId` of the map's root.

### Requester

The identity making a request to access tiles. Every read operation carries requester context:

- **Authenticated User** - A logged-in user identified by their user ID
- **Anonymous** - An unauthenticated visitor (can only see public tiles)
- **System Internal** - Server-side operations that bypass visibility filtering

### Visibility Filter

The automatic mechanism that filters query results based on requester identity:
- Owner accessing own tiles: all tiles visible (public + private)
- User accessing others' tiles: only public tiles visible
- Anonymous accessing any tiles: only public tiles visible

## Philosophy

### Strategic Mapping

The intentional design of hierarchical structures to clarify thinking and enable understanding. Not about finding "natural" structures but creating ones that serve specific purposes.

### Progressive Refinement

The iterative process of expanding Tiles until sufficient context exists for execution (by human or AI).

### Visual Programming

Building complex systems through spatial arrangement and visual composition rather than traditional code.

### Hexplan-Driven Autonomous Execution

The Hexframe approach to AI orchestration differs fundamentally from conversational interaction:

| Conversational AI | Hexframe |
|-------------------|----------|
| Chat back-and-forth | Define structure, run autonomously |
| Hope agent interprets correctly | Place instructions at exact location |
| Interrupt to course-correct | Edit hexplan, agent adapts |
| Context lost between sessions | Hexplan persists, agent resumes |

The workflow:
1. Define system as hierarchy of tasks with context
2. Run `hexecute` — agent works autonomously through subtasks
3. Monitor by reading hexplan tiles
4. To adjust: stop agent, edit hexplan, restart
5. Agent reads hexplan, skips completed steps, continues

### Hexframe Bootstrapping

Since hexplans are central to execution, Hexframe provides a default system for initializing hexplans — using Hexframe's own formalism. This self-referential capability demonstrates the model's power: the system that creates hexplans is itself a Hexframe system.

---

_This is a living document. New terms will be added and existing definitions refined as the Hexframe language evolves._
