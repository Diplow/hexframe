# Milestone 2: Jay AI System & HexFrame Orchestration

## The Vision

Transform HexFrame from a knowledge mapping tool into an AI orchestration platform where the hexagonal formalism directly drives multi-agent workflows, context management, and system creation.

## Core Innovation: HexFrame as AI Operating System

### The Jay Agent Architecture
**Jay** = The system creation agent that helps users build and improve systems using HexFrame formalism:

```
Center: Help user create a system
├─ 1. Clarify: What system? → [know/ask user]
├─ 2. Foundation: Existing base? → [create/build upon]
├─ 3. Activation: Already using? → [find MVP/continue]
├─ 4. Validation: Serving goal? → [adjust/proceed]
├─ 5. Timing: Improve now? → [yes/reflect]
└─ 6. Evolution: How to improve? → [execute]
```

Each step has decision gates: does Jay know the answer or ask the user?

### HexFrame Formalism for AI Orchestration

**1. Plans as Frames**
- **Goal** = Center tile (what we want to achieve/decide)
- **Steps** = Child tiles (how to achieve the goal)
- **Context** = Parent/sibling tiles (relevant background)

**2. Color-Based Context Engineering**
- **Same color siblings**: Single agent maintains context across tasks
- **Tint inheritance**: Parent reasoning about child context inclusion
- **Lightness gradients**: Context filtering/abstraction levels

**3. Edge-Based Interaction Specs**
- **Sibling edges**: Data flow, synchronization points
- **Parent-child edges**: Context inheritance rules, abstraction boundaries

**4. Tile Composition for Reusable Context**
- Systems can reference shared context tiles
- Version-controlled system knowledge
- Clear dependency graphs for complex orchestration

## Implementation Phases

### Phase 1: Prompts as Executable Tiles (Immediate Value)
**Goal**: Make tiles executable with "Run" buttons
- Tiles containing prompts become runnable
- Children provide context for execution
- Immediate value: persistent, reusable, shareable prompts
- **Differentiation**: Unlike ChatGPT/Claude, prompts are persistent, composable, version-controlled

### Phase 2: Jay Integration & Tool Use
**Goal**: Implement Jay's system creation workflow
- Add CRUD tools for tiles from chat
- Jay creates/updates tiles as it helps users
- Emerging maps ARE the system documentation
- **Value**: AI that builds structured documentation while helping

### Phase 3: Multi-Agent Router
**Goal**: Route conversations to specialized agents
```
Center: Hexframe Assistant
├─ Jay: System creation and improvement
├─ Explorer: Navigate existing systems
├─ Teacher: Explain HexFrame concepts
└─ Builder: Technical implementation help
```

### Phase 4: Advanced Orchestration
**Goal**: Full HexFrame formalism leverage
- Color-based agent routing and context management
- Edge-based workflow orchestration
- Tile composition for complex system interactions
- Multi-iteration agent workflows with persistent plans

## Success Criteria

**Immediate (Phase 1-2)**
- Users can execute prompts directly from tiles
- Jay helps users build systems while creating documentation
- Value proposition clear vs existing AI tools

**Medium-term (Phase 3-4)**
- Multi-agent conversations feel natural and productive
- Users create complex systems through conversation
- HexFrame becomes the interface layer for AI orchestration

**Long-term Vision**
- System thinkers become visionaries through AI amplification
- HexFrame formalism proves as the optimal AI coordination protocol
- Users build living systems, not just documentation

## The Transformation

From: "Knowledge mapping tool with chat"
To: "AI orchestration platform where spatial relationships drive agent behavior"

The hexagonal map stops being documentation and becomes the computational substrate for AI coordination - the visual representation IS the execution plan.

## Dependencies

- **Milestone 1**: Must complete dogfooding to validate workflow approach
- **MCP Integration**: Required for tile CRUD from chat
- **User Experience**: Simple onboarding for non-technical users

This milestone represents the core innovation that makes HexFrame fundamentally different from existing AI tools - turning spatial organization into computational orchestration.