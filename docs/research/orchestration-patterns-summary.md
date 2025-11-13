# AI Agent Orchestration: Quick Reference Guide

**Date:** 2025-11-10
**Context:** Research synthesis for Hexframe's hexagonal task orchestration

---

## Core Orchestration Primitives

Every mature agent framework uses these five primitives:

1. **Agents**: LLM-powered units with role, instructions, and tools
2. **State/Memory**: Short-term (working context) + Long-term (persistent knowledge)
3. **Tools**: External functions agents can invoke
4. **Handoffs**: Mechanisms for transferring control between agents
5. **Planning**: Breaking complex goals into subtasks

---

## Where Orchestration Logic Lives

Three primary approaches:

| Approach | Example | Pros | Cons |
|----------|---------|------|------|
| **Declarative Config** | CrewAI (YAML) | Easy to read, non-programmers can edit | Limited expressiveness |
| **Structural Graph** | LangGraph (DAG) | Precise control, visual representation | Requires programming knowledge |
| **Implicit Prompts** | AutoGen, BabyAGI | Flexible, adaptive | Hard to debug, non-deterministic |

**Best Practice**: Hybrid approach—structure + templates

---

## Framework Comparison

| Framework | Best For | State Management | Learning Curve | Production Ready |
|-----------|----------|------------------|----------------|------------------|
| **LangGraph** | Complex workflows, precise control | Checkpointed with time-travel | Steep | Yes |
| **CrewAI** | Rapid prototyping, team coordination | Framework-managed | Low | Yes |
| **AutoGen** | Dynamic collaboration, enterprise | Event-sourced, distributed | Medium | Yes |
| **Semantic Kernel** | Multiple patterns, MS ecosystem | Unified interface | Medium | Q1 2025 |

---

## Key Patterns

### Task Decomposition
- **Hierarchical Task Networks (HTN)**: Recursive breakdown into subtasks
- **Post-Order Flattening**: Convert tree to sequential list (leaves first)
  - Used by AgentOrchestra (2025 research)
  - **Hexframe implements this in 'plan' mode** ✓

### State Management
- **Checkpointing**: Save state at each step (LangGraph standard)
- **Thread-based**: Separate state per conversation/user
- **Hybrid Memory**: Short-term (working) + Long-term (persistent)

### Context Engineering
- **Progressive Disclosure**: Start minimal, expand as needed
- **Layered Assembly**: Orchestrator → History → Goal → Context → Plan
- **Token Budgeting**: Allocate tokens per section
  - **Hexframe uses layered assembly** ✓

### Coordination
- **Sequential**: Task1 → Task2 → Task3
- **Parallel**: Multiple agents work simultaneously
- **Hierarchical**: Supervisor delegates to workers
- **Conditional**: Route based on classification

---

## Production Best Practices

### Critical for Production
1. **Observability**: Log all prompts, completions, tool calls with correlation IDs
2. **Multi-tenancy**: Isolate user data (thread IDs, tenant scoping)
3. **Cost Control**: Max iterations, loop breakers, caching
4. **Security**: Input validation, sandboxing, short-lived credentials
5. **Reliability**: Retries, fallbacks, checkpoint-based resume

### Testing Strategy
- **Unit**: Test individual components with mocked LLMs
- **Integration**: Test orchestration flows with cheaper models
- **E2E**: Full workflows with production LLMs (automated evaluation)

---

## Hexframe Alignment with Best Practices

### What We Already Do Right ✓
1. **Hierarchical Structure**: Tiles with parent-child relationships
2. **Post-Order Flattening**: In 'plan' mode for global view
3. **Context Composition**: Layered assembly (orchestrator → goal → context → plan)
4. **Template-Based Orchestration**: User-customizable orchestrator tiles
5. **Execution History**: Dedicated tile (direction 0) for state
6. **Coordinate References**: Efficient state (coords vs full objects)

### Recommended Enhancements

**High Priority**:
- [ ] Structured checkpointing (resume on failure, time-travel debugging)
- [ ] Comprehensive observability (token tracking, execution metrics)
- [ ] Error handling and retry logic

**Medium Priority**:
- [ ] Long-term memory system (vector embeddings, semantic search)
- [ ] Context optimization (token budgets, relevance ranking)

**Low Priority**:
- [ ] Parallel execution (leverage six directions for concurrency)
- [ ] Advanced patterns (conditional routing, iterative refinement)

---

## Hexagonal Structure: Why It Matters

### Neuroscience Backing
- **Grid Cells**: Nobel Prize-winning discovery—neurons fire in hexagonal patterns during spatial navigation
- **Optimal Encoding**: Hexagons are biologically optimal for 2D spatial representation
- **Cognitive Maps**: Spatial + graph-like representations coexist in brain

### Mathematical Properties
- **Optimal Tiling**: Cover plane with minimal perimeter
- **Six Neighbors**: Natural branching factor (vs 4 or 8)
- **Uniform Distance**: All neighbors equidistant from center

### Research Validation (2024)
- Geospatial KGs improve with topology and direction features
- Hierarchical spatial representations scale better than flat
- Spatial encoding aids AI reasoning and retrieval

**Hexframe's Advantage**: Combines cognitive benefits of spatial navigation with execution power of agent orchestration.

---

## Context Engineering vs Prompt Engineering

**The Shift** (2024-2025):
- **Old**: "What's the perfect prompt?"
- **New**: "What context does the agent need?"

**Context Engineering** = Systematic gathering, filtering, and composition of information
**Prompt Engineering** = Instructions for what to do

**Anthropic (2024)**: "Context engineering is the #1 job of engineers building AI agents."

**Hexframe Implementation**:
```xml
<orchestrator>System-level guidance</orchestrator>
<execution-history>What's been done</execution-history>
<goal>Current objective + ancestry + siblings</goal>
<context>Composed tiles (domain knowledge)</context>
<plan>Subtasks to execute</plan>
```

---

## Memory Systems

### Short-term Memory (Working Context)
- **Scope**: Current session/thread
- **Storage**: Checkpoints, conversation history
- **Lifetime**: Single execution
- **Hexframe**: Execution history tile

### Long-term Memory (Persistent Knowledge)
- **Scope**: Cross-session, user-wide
- **Storage**: Vector databases, knowledge graphs
- **Lifetime**: Indefinite
- **Hexframe**: Reference tiles, composed context

### Consolidation Pattern (Recommended)
```
Short-term → Filter by importance → Long-term
Execution History → Learnings → Reference Tiles
```

---

## Specific Implementation Patterns

### Checkpoint Structure
```typescript
interface HexecuteCheckpoint {
  checkpointId: string
  taskCoords: string
  threadId: string
  currentSubtask: number
  totalSubtasks: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  completedSubtasks: Array<{coords, output, tokens}>
  tokenUsage: number
  createdAt: Date
}
```

### Context Budget Allocation
```typescript
interface ContextBudget {
  totalTokens: number
  allocation: {
    orchestrator: 20%
    executionHistory: 15%
    goal: 20%
    context: 20%
    plan: 25%
  }
}
```

### Parallel Execution (Future)
```typescript
// Hexframe advantage: 6 directions = natural concurrency limit
// Execute independent siblings in parallel
const results = await Promise.allSettled(
  siblings.map(s => executeSubtask(s, orchestratorConfig))
)
```

---

## Key Research Papers

1. **AgentOrchestra** (2025): Hierarchical multi-agent with planning agent pattern
2. **Taxonomy of Hierarchical Multi-Agent Systems** (2025): Five axes of design
3. **Task Planning with LLMs Survey** (2024): Comprehensive decomposition strategies
4. **Cognitive Maps and Cognitive Graphs**: Neuroscience of spatial knowledge
5. **Geometric Feature Enhanced KG** (2024): Spatial reasoning improvements

---

## Strategic Positioning

**What Makes Hexframe Unique**:
1. **Spatial Navigation**: Neuroscience-backed hexagonal structure
2. **Unified Knowledge + Execution**: Same tiles for docs and tasks
3. **User-Customizable Orchestration**: Users define templates, not framework
4. **Transparent by Design**: Explicit XML prompts, no hidden magic

**Market Angle**: "The first AI orchestration system that thinks like you do—spatially, hierarchically, and transparently."

---

## Development Roadmap

### Phase 1: Solidify (Immediate)
- Structured execution checkpoints
- Error handling and retry logic
- Token usage tracking
- Comprehensive tests

### Phase 2: Enhanced Memory (Next)
- Long-term memory with vector embeddings
- Memory consolidation from execution history
- Semantic search across tasks

### Phase 3: Advanced Orchestration (Future)
- Parallel subtask execution
- Conditional branching via composed tiles
- Iterative refinement loops

### Phase 4: Ecosystem (Vision)
- Shareable orchestrator templates marketplace
- Pre-built task patterns (recipes)
- Community voting, analytics dashboard

---

## Quick Decision Guide

**When to use each framework** (for comparison/learning):

- **LangGraph**: Need precise control, complex state, production deployment
- **CrewAI**: Rapid prototyping, simple team coordination, quick demos
- **AutoGen**: Enterprise scale, distributed agents, chat-style coordination
- **Semantic Kernel**: Microsoft ecosystem, need multiple orchestration patterns

**Why Hexframe is different**:
- Built for system thinkers who visualize spatially
- Knowledge and execution in unified model
- User owns orchestration templates
- Transparent context engineering

---

## Key Metrics to Track

For production Hexframe deployment:

1. **Task Success Rate**: % completed correctly
2. **Token Efficiency**: Tokens per task
3. **Latency**: Time to completion
4. **Cost**: $ per execution
5. **User Satisfaction**: Ratings, retention

**Implementation**: Store in execution history metadata, aggregate for analytics.

---

## Resources

- Full research report: `./ai-agent-orchestration-2024-2025.md`
- Current hexecute implementation: `/src/server/api/routers/agentic/agentic.ts`
- Prompt executor: `/src/lib/domains/agentic/services/prompt-executor.service.ts`
- LangGraph docs: https://docs.langchain.com/oss/python/langgraph/
- CrewAI docs: https://docs.crewai.com/
- Anthropic context engineering: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents