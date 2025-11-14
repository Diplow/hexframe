# Hexframe

A visual framework for building and sharing AI-powered systems through hierarchical hexagonal maps.

## Vision

Hexframe aims to transform how humans and AI collaborate by creating a visual language for intent and context. Instead of crafting complex prompts, you build structured maps that both humans and AI can understand, share, and compose.

We envision an ecosystem where:

- AI workflows are transparent and inspectable
- Complex systems are built from simple, reusable components
- Knowledge and expertise are easily shared and composed
- The gap between human intent and AI execution is visually bridged

## Product

Hexframe is built on a simple yet powerful concept: hierarchical hexagonal maps that represent structured thinking.

### Core Components

**Tile**
A hexagonal unit representing a single concept, task, or function. Like a function in programming, a Tile has a clear name that conveys WHAT it does.

**Frame**
When a Tile is expanded, it becomes a Frame: one CenterTile surrounded by up to 6 child Tiles. This reveals HOW the Tile accomplishes its purpose.

**Map**
A view centered on a specific tile, showing its descendants through expanded frames, but maintaining abstraction boundaries at CenterTiles.

**System**
The complete hierarchical structure including all nested Maps, providing full transparency without abstraction boundaries.

### Spatial Meaning in Frames

The hexagonal arrangement isn't arbitrary - the spatial relationships convey meaning:

- **Opposite tiles** represent tensions or complementary aspects (e.g., Vision ↔ Usage)
- **Neighboring tiles** share natural connections and often work together
- **The center** is what unifies the surrounding concepts

This creates a rich semantic structure where each tile has:

- 1 opposite (maximum conceptual distance)
- 0-2 neighbors (natural collaborators)
- 1 center (unifying purpose)

The spatial arrangement itself becomes a form of documentation, revealing how concepts relate and interact.

### The Power of 6

Each Frame can have **at most** 6 child Tiles. This constraint:

- **Forces Prioritization**: Identify what truly matters
- **Maintains Cognitive Load**: Humans effectively track 5-9 items (Miller's Law)
- **Encourages Abstraction**: Complex ideas must be properly nested
- **Enables Visual Clarity**: Hexagonal layouts remain navigable

You don't need all 6 slots - use what clarifies your intent:

- 2 tiles for binary distinctions
- 3 for pillars or phases
- 4 for quadrants
- 6 for complete frameworks

The "right" structure depends on your context, audience, and goals. Hexframe makes these choices explicit and shareable.

### Visual Composition System

Hexframe enables building complex AI systems through drag-and-drop composition:

**Tool Tiles**

- **LLM Tools**: Configure AI models (Claude, GPT-4, etc.) as reusable tiles
- **Specialized Tools**: Code execution, web search, databases, APIs
- **Custom Tools**: Any capability wrapped in a tile interface

**Composition Mechanics**

- **Drag to Center**: Compose tiles to create new systems
  - Example: Drag LLM onto PromptTile → Creates a reusable AI component
- **Drag to Neighbor**: Augment tiles with additional capabilities
  - Example: Drag CodeExecution next to LLM → LLM can now write and run code

**CollaborativeMaps**
Pre-designed communication templates where:

- Multiple empty frames await LLM composition
- Connections define how agents communicate
- Drag different LLMs/tools to create custom multi-agent systems

**Example: Building a Product Team**

1. Start with CollaborativeMap template
2. Drag Claude onto Strategist position
3. Drag GPT-4 + CodeExecution onto Developer position
4. Drag Gemini + Database onto Architect position
5. System automatically orchestrates based on predefined protocols

No code required - complex AI orchestration through visual programming.

## Users

Hexframe is designed for:

- **Developers** building AI-powered applications who need structured workflows
- **Product Managers** designing complex systems with clear abstraction levels
- **Teams** sharing and standardizing their approaches to common tasks
- **Educators** teaching systematic thinking and decomposition
- **Anyone** who wants to collaborate with AI beyond simple prompts

The framework grows with you - from simple task decomposition to complex multi-agent orchestration.

## Usage

### Core Workflow

1. **Start with Intent**: Create a CenterTile describing what you want
2. **Expand for Context**: If too complex for AI, expand into a Frame showing HOW
3. **Progressive Refinement**: Continue expanding until AI has sufficient context
4. **Execute**: AI can now understand and execute the entire structured intent

### Example: Product Development

A "Product Crew" frame orchestrates the entire development lifecycle:

- **Strategist**: Vision, context, needs, prioritization
- **Problem**: Feedback analysis, data, client insights
- **Solution**: Ideation, simplification, validation
- **Architecture**: System design, technology choices
- **Development**: Planning, TDD, implementation, refactoring
- **Deployment**: Release planning, feature flags, monitoring

Each tile can be:

- A simple task for AI to execute
- A reference to another user's proven framework
- An orchestrator coordinating multiple specialized AI agents

### Composition Power

- **Import & Adapt**: Use others' frames as tiles in your system
- **Specialize**: Each tile can have its own AI with specific expertise
- **Orchestrate**: Define how tiles communicate and collaborate
- **Maintain Control**: Always see and modify what's inside

## Tech

### Architecture

Hexframe follows a clean, layered architecture:

**Frontend** (Next.js 15 App Router)

- Progressive enhancement with static, progressive, and dynamic components
- See: `/src/app/map/README.md` for detailed component patterns

**Backend** (tRPC + Next.js API)

- Type-safe API layer with tRPC routers
- Server-side caching and optimizations
- See: `/src/server/README.md` for backend architecture

**Domain Layer** (Domain-Driven Design)

- Isolated business logic in `/src/lib/domains/`
- Clear boundaries between mapping, IAM, and other domains
- See: `/src/lib/domains/README.md` for DDD implementation

**Data Layer** (Drizzle ORM + PostgreSQL)

- Type-safe database queries with Drizzle
- PostgreSQL for reliable data storage
- Migrations in `/drizzle/migrations/`
- localStorage for performance caching

### Quick Start

```bash
# Prerequisites: Node.js 20+, PostgreSQL 15+, pnpm

# Setup
git clone https://github.com/diplow/hexframe.git
cd hexframe
pnpm install
cp scripts/example.env .env

# Run
./scripts/start-database.sh
pnpm db:migrate
pnpm dev
```

### Development

```bash
pnpm dev          # Development server (port 3000)
pnpm build        # Production build
pnpm lint         # Linting
pnpm typecheck    # Type checking
pnpm test         # Run tests
```

### Tech Stack

- **Frontend**: Next.js 15, React, TypeScript
- **Backend**: tRPC, Drizzle ORM, PostgreSQL
- **Styling**: Tailwind CSS
- **Testing**: Vitest, React Testing Library

## Team

Hexframe is currently developed by a single passionate developer who believes in the power of visual thinking and structured AI collaboration. Learn more about the [personal journey](docs/company/USER.md) behind Hexframe.

While it's a solo project now, the vision is to build a community of contributors who share the belief that AI interaction can be more than just prompting - it can be a structured, shareable, and composable process.

### Get Involved

- **GitHub**: [Contribute to the codebase](https://github.com/diplow/hexframe)
- **Issues**: [Report bugs or suggest features](https://github.com/diplow/hexframe/issues)
- **Discussions**: [Join the conversation](https://github.com/diplow/hexframe/discussions)

---

_Hexframe: Where human intent meets AI capability through strategic mapping._
