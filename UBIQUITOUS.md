# Ubiquitous Language

A living glossary of terms used in the Hexframe project. This document establishes a shared vocabulary to ensure clear communication between developers, users, and AI systems.

## Core Structure

### Tile

A hexagonal unit representing a single concept, task, or function. Like a function in programming, a Tile has a clear name that conveys WHAT it does or WHAT it is about without revealing HOW.

### Frame

The result of expanding a Tile. A Frame consists of one CenterTile surrounded by up to 6 child Tiles, revealing HOW the original Tile accomplishes its purpose.

### CenterTile

A special Tile that serves as the center of a Frame. While visually identical to a regular Tile, expanding a CenterTile (not implemented yet) creates a new Map rather than adding to the current Generation.

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

**Structural Directions (Positive 1-6):**
- 1 = NW (Northwest)
- 2 = NE (Northeast)
- 3 = E (East)
- 4 = SE (Southeast)
- 5 = SW (Southwest)
- 6 = W (West)

**Composed Directions (Negative -1 to -6):**
- -1 = ComposedNW (Composed Northwest)
- -2 = ComposedNE (Composed Northeast)
- -3 = ComposedE (Composed East)
- -4 = ComposedSE (Composed Southeast)
- -5 = ComposedSW (Composed Southwest)
- -6 = ComposedW (Composed West)

**Meta Orchestration (Direction 0):**
- 0 = Center (Reserved for future meta-orchestration - tiles that define how to execute a task)

Positive directions represent structural hierarchy (regular children). Negative directions represent composition (tiles combined to create new functionality). The negative direction values are a storage implementation detail - UX-wise, composed children appear in the same hexagonal positions as structural children.

Best practice: Use string representations (NW, NE, etc.) in user interfaces and documentation for clarity, while using integers internally for Path calculations.

### Path

An array of direction integers representing a Tile's position in the hierarchy. Examples:
- [1, 2, 3] means: from root, go to NW child, then its NE child, then its E child (all structural)
- [1, -3, 4] means: from root, go to NW child, then its ComposedE child, then its SE child (mixed structural and composed)

Negative values in the path indicate composed children at that level of the hierarchy.

## Composition System

### Tool Tile

A Tile that wraps a specific capability (LLM, code execution, database access, etc.) with a defined interface of inputs and outputs.

### LLM Tile

A specific type of Tool Tile that provides access to a Large Language Model with configuration (API key, model selection, parameters).

### Context Tile

The most basic and commonly used Tile type, containing a title and description. Behavior when composed:
- With an LLM Tile: Provides the context (title + description) to the LLM
- With another Context Tile: Concatenates both contexts into a single combined context

This serves as the fundamental building block for creating knowledge structures and providing information to AI systems.

### Prompt Tile

A Tile containing a prompt template with parameters. When composed with an LLM Tool, creates a reusable AI component.

### Composition

The act of combining Tiles to create new functionality stored using negative direction values. When you compose tiles (e.g., via drag-and-drop), the composed children are stored as direct children of their parent using negative directions (-1 to -6), allowing a tile to have both structural children (directions 1-6) and composed children (directions -1 to -6) simultaneously.

**Storage Implementation:**
- Structural children: Stored at positive directions (1-6)
- Composed children: Stored at negative directions (-1 to -6)
- Direction 0: Reserved for future meta-orchestration functionality

**User Experience:**
- The negative direction values are an internal storage detail
- UX-wise, users see composed children appear in the same hexagonal positions
- Composition expansion is controlled by a boolean toggle, not individual tile selection

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

## Philosophy

### Strategic Mapping

The intentional design of hierarchical structures to clarify thinking and enable understanding. Not about finding "natural" structures but creating ones that serve specific purposes.

### Progressive Refinement

The iterative process of expanding Tiles until sufficient context exists for execution (by human or AI).

### Visual Programming

Building complex systems through spatial arrangement and visual composition rather than traditional code.

---

_This is a living document. New terms will be added and existing definitions refined as the Hexframe language evolves._
