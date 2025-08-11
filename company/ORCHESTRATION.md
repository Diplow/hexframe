# AI Orchestration in Hexframe

## Core Concepts

### Task
A **task** is the atomic unit of AI orchestration in Hexframe, represented by a single tile. It:
- Takes an instruction (text) and context (text) as input
- Processes them through an AI model or external system
- May call other tasks as part of its execution
- Returns a result

Example: A "Summarize" task that takes an article as context and returns key points.

### Workflow
A **workflow** chains tasks together, represented by a frame showing the sequence and conditions:
- Defines the order of task execution
- Specifies conditions for choosing the next task
- Manages data flow between tasks
- Handles branching and parallel execution

Example: A "Research" workflow that chains Search → Filter → Analyze → Summarize tasks.

### Perspective
A **perspective** is a structured way to format context, represented by a frame showing different viewpoints or tensions:
- Defines a lens through which to view problems
- Structures context according to specific frameworks
- Provides multiple angles for consideration
- Based on philosophical or methodological principles

Example: A "Culture" perspective that formats context through the six tensions defined in company/CULTURE.md.

## The Creative Workflow

The creative workflow is a special orchestration pattern that leverages perspectives to enhance AI reasoning about open questions. It works in two phases:

1. **Initial Response**: The LLM generates its natural response with inherent biases
2. **Perspective Challenge**: The LLM systematically challenges and enriches its response using:
   - Each tension in the perspective
   - Relationships between neighboring concepts
   - Synthesis of opposing viewpoints

This creates a "custom thinking process" where the AI doesn't just answer but explores the question through structured lenses.

## Leveraging Company Systems as Perspectives

### Culture Perspective
Based on company/CULTURE.md, this perspective explores questions through:
- **Systems Thinking ↔ Materialism**: Abstract patterns vs concrete impact
- **Human-first ↔ AI-first**: Human agency vs AI capability
- **Humility ↔ Revolution**: Current limitations vs transformative ambition

### Mission Perspective
Based on company/MISSION.md, this perspective examines:
- **Legitimacy ↔ Competence**: Right goals vs effective execution
- **Will ↔ Deliberation**: Individual conviction vs collective wisdom
- **Vision ↔ Execution**: Compelling future vs concrete actions

### Politics Perspective
Based on company/POLITICS.md, this perspective analyzes:
- **Deliberation ↔ Revolution**: Consensus-building vs radical transformation
- **Legitimacy ↔ Competence**: Collective will vs effective governance
- **People ↔ Production**: Human subjects vs material outputs

## Orchestration Patterns

### Single Perspective Deep Dive
```
Question → Initial Response → Culture Perspective → Enriched Answer
```
The AI explores one perspective thoroughly, examining each tension and their interactions.

### Multi-Perspective Synthesis
```
Question → Initial Response → [Culture, Mission, Politics] → Synthesized Answer
```
The AI applies multiple perspectives in parallel, then synthesizes insights.

### Perspective Evolution
```
Question → Culture → Mission → Politics → Integrated Answer
```
Each perspective builds on the previous, creating layered understanding.

### Adversarial Perspectives
```
Question → Response → Opposing Perspectives → Balanced Answer
```
Different perspectives challenge each other, surfacing conflicts and trade-offs.

## Implementation Example

When asked "What do you think about this article?", the creative workflow would:

1. **Generate Initial Thoughts**: Natural response based on training
2. **Apply Culture Perspective**:
   - How does this relate to systems vs material impact?
   - What's the balance of human vs AI agency?
   - Where's the humility vs revolutionary potential?
3. **Explore Neighbor Relationships**:
   - How does systems thinking enable revolution?
   - How does AI-first serve materialism?
   - How does humility ground human-first approaches?
4. **Synthesize Insights**: Integrate discoveries into enriched response

## Benefits of Perspective-Based Orchestration

1. **Transparent Reasoning**: Makes AI thinking process visible and understandable
2. **Reduced Bias**: Systematic exploration counters initial biases
3. **Richer Responses**: Multiple angles yield more nuanced answers
4. **Customizable Thinking**: Organizations can define their own perspectives
5. **Collaborative Intelligence**: Humans can see and guide AI reasoning

## Future Directions

As Hexframe evolves, perspective-based orchestration could enable:
- **Domain-Specific Perspectives**: Medical, legal, engineering viewpoints
- **Cultural Perspectives**: Different philosophical or cultural frameworks
- **Dynamic Perspectives**: AI-generated perspectives based on context
- **Perspective Marketplace**: Sharing and composing thinking frameworks
- **Meta-Perspectives**: Perspectives about choosing perspectives

The goal is to transform AI from a black-box oracle into a transparent thinking partner whose reasoning process can be understood, customized, and improved through structured perspectives.