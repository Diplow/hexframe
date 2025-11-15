# AI Orchestration Philosophy

**Status**: Experimental hypothesis
**Last Updated**: 2025-11-10

---

## The Core Intuition

Hexframe is exploring a radical premise: **AI orchestration should be prompt-native, not code-native**.

This document captures our current thinking about how spatial structure (hexagonal tiles) + flexible logic (prompts) could create a uniquely intuitive AI orchestration system.

**Important**: This is an evolving hypothesis based on intuition and early experiments, not proven methodology. We're learning as we build.

---

## The Mental Model

### Traditional AI Orchestration
```
Code → defines rigid logic
Prompts → fill in the details
Structure → emergent from code
```

**Problem**: Users can't customize orchestration without changing code. The framework dictates the patterns.

### Hexframe's Hypothesis
```
Structure → hexagonal tile hierarchy (spatial knowledge)
Prompts → define flexible orchestration logic  
Code → provides primitives (infrastructure)
```

**Vision**: Users customize orchestration by editing prompts in tiles, not by writing code. The spatial structure makes relationships intuitive.

---

## The Four Primitives

We believe AI orchestration needs four fundamental capabilities, each mappable to Hexframe concepts:

### 1. State Management
**What**: Track execution progress, variables, decisions
**Hexframe**: Execution history tiles with markdown state sections
**Why prompts**: State schema and update rules can be expressed in natural language

**Example**:
```markdown
## State
- mcp_server: debughexframe
- destination_coords: [UNSET]

## State Instructions
Before executing, check all variables are set...
```

### 2. Context Building  
**What**: Assemble relevant information for each task
**Hexframe**: Navigate tile hierarchy, select content at appropriate depth
**Why prompts**: Context selection strategy can be described, not hard-coded

**Example**: "Include parent ancestry at 'title' level, siblings at 'preview' level, composed children at full 'content' level"

### 3. Orchestration Logic
**What**: Decide how to coordinate subtasks
**Hexframe**: Orchestrator tiles with instructions
**Why prompts**: Different tasks need different coordination strategies

**Example**: "Execute subtasks sequentially in post-order" vs "Route to specialist based on classification"

### 4. Subagent Spawning
**What**: Execute subtasks with scoped context
**Hexframe**: Spawn agents with task-specific prompts
**Why prompts**: Parent instructs how to delegate and integrate results

---

## Hexframe-Specific Advantages

### Spatial Navigation as Cognitive Aid

**The insight**: Humans think spatially. System thinkers especially.

**Hexagonal structure provides**:
- **Visual hierarchy**: Parent-child relationships are literally centered
- **Six directions**: Natural limit (Rule of 6) prevents overwhelming complexity
- **Neuroscience backing**: Grid cells in brain fire in hexagonal patterns (Nobel Prize 2014)

**For AI orchestration**:
- Subtasks aren't an abstract list—they're visible neighbors
- Composed context isn't hidden config—it's spatially "inside" the tile
- Execution flow isn't a trace log—it's tiles lighting up in sequence

### Prompt-Native Orchestration

**Current frameworks**:
- LangGraph: Define orchestration as Python code (nodes + edges)
- CrewAI: Define orchestration as YAML config
- AutoGen: Orchestration emergent from agent conversations

**Hexframe hypothesis**:
- Define orchestration as **prompts in tiles**
- Prompts reference **Hexframe primitives** (MCP tools)
- Users **customize by editing tiles**, not forking repos

**Potential advantages**:
1. **Lower barrier**: Editing prompts vs writing code
2. **Visual debugging**: See prompts spatially, not in files
3. **Composable**: Reference other systems' orchestration tiles
4. **Transparent**: Full prompts visible, no framework magic

---

## The Hexframe MCP Primitives (Proposed)

Code provides infrastructure, prompts use it:

### Navigation
```
hexframe:getParent(coords)
hexframe:getSiblings(coords)  
hexframe:getChildren(coords)
hexframe:getComposed(coords)
hexframe:getAncestry(coords)
```

### Context Engineering
```
hexframe:getTileAtDepth(coords, depth: 'title'|'preview'|'content')
hexframe:walkHierarchy(startCoords, strategy)
hexframe:selectRelevantContext(coords, tokenBudget)
```

### Mutation
```
hexframe:createTile(coords, content)
hexframe:updateTile(coords, content)
hexframe:moveTile(oldCoords, newCoords)
```

### Execution
```
hexframe:spawnSubagent(taskCoords, prompt)
hexframe:updateExecutionState(coords, state)
hexframe:checkpoint(taskCoords)
```

### Observability
```
hexframe:getExecutionHistory(coords)
hexframe:getActiveAgent(coords)
hexframe:getTokenUsage(coords)
```

Prompts orchestrate by calling these primitives.

---

## Example: Triage Agent (Conceptual)

**Tile: Hexframe Triage (23,0:5)**
```markdown
You are the Hexframe Triage Agent.

When a user message arrives:

1. Update state: hexframe:updateExecutionState(23,0:5,0, {status: 'analyzing'})
   (UI shows tile blinking yellow)

2. Classify message type:
   - System creation → route to Donella (direction 1)
   - Research → route to Elianor (direction 2)
   - Vision/rules → route to Jay (direction 3)

3. Update state with routing decision

4. Spawn chosen agent: hexframe:spawnSubagent(targetCoords, userMessage)

5. Return agent's response verbatim
```

**User sees**:
- Triage tile blinks yellow
- Chosen agent's tile blinks green
- Can rewind and edit triage prompt if wrong choice

**No code needed** for this orchestration pattern—just the prompt.

---

## Open Questions

### What We're Still Figuring Out

1. **Reliability**: Can prompts reliably orchestrate complex workflows?
   - Early signs: Yes (see hexecute experiments)
   - Risk: LLM hallucinations, prompt ambiguity
   - Mitigation: Observability, user iteration

2. **Performance**: Is LLM inference too slow for orchestration?
   - Early signs: Acceptable for human-in-loop workflows
   - Risk: Can't handle high-throughput automation
   - Mitigation: Cache/compile hot paths, use smaller models

3. **Debugging**: How do users debug prompt-based orchestration?
   - Hypothesis: Full prompt logs + visual tile highlighting
   - Unknown: Is this enough? Need user studies

4. **Composition vs Decomposition**: How to spatially represent?
   - Options: Negative directions, itemType field, transition tiles
   - Decision pending: Wait for visualization design

5. **Code vs Prompt Balance**: Where's the line?
   - Current: Some logic in code (prompt-executor.service.ts)
   - Vision: More logic in prompts over time
   - Unknown: What must stay in code?

---

## Relationship to Mission

**Mission**: Enable system thinkers to create living systems that AI activates

**This doc explores HOW**:
- Systems = Hexagonal tile structures
- Living = AI interprets and executes them
- Activation = Prompt-native orchestration

**Why it matters**:
- System thinkers think spatially and hierarchically
- They want to customize logic without code
- Transparent orchestration (visible prompts) builds trust

**Status**: Implementation detail that might become core differentiation

If prompt-native orchestration proves superior for system thinkers, it could inform mission/positioning. For now, it's an experiment.

---

## Inspirations

### Software Engineering
- **Domain-Driven Design**: Separating domain logic from infrastructure
- **Hexagonal Architecture**: Adapters around core domain (Hexframe name origin!)
- **Unix Philosophy**: Small, composable primitives

### AI Orchestration
- **LangGraph**: Checkpointing, state management patterns
- **OpenAI Swarm**: Lightweight, prompt-native handoffs
- **AgentOrchestra**: Hierarchical planning with post-order execution

### Cognitive Science
- **Grid Cells**: Hexagonal firing patterns in spatial navigation (Nobel 2014)
- **Cognitive Maps**: Spatial + graph-like mental models
- **Systems Thinking**: Donella Meadows, leverage points, feedback loops

---

## Next Steps

1. **Continue experiments** with current hexecute implementation
2. **Build visualization** to test spatial orchestration UX
3. **Collect user feedback** on prompt editing experience  
4. **Measure reliability** of prompt-based orchestration
5. **Document patterns** that work vs don't work

**Success criteria**: System thinkers without coding experience can create and customize orchestration workflows by editing prompts in the Hexframe UI.

---

## For Contributors

**If you're working on Hexframe orchestration**:

- This doc captures current philosophy, not rigid rules
- Code pragmatically (don't over-abstract for future vision)
- Log intuitions and experiments (we're learning together)
- Challenge assumptions (especially mine!)

**Key principle**: Build for system thinkers who think spatially, not for engineers who think in code.

---

**Questions or thoughts?** Discuss in GitHub issues or with the team.
