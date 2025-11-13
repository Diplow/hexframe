# Creative Workflow: Leveraging Perspectives for Open Questions

## Overview

The Creative Workflow is a structured approach for AI to explore open questions using hexagonal perspectives. Instead of providing a single answer, the AI systematically challenges and enriches its thinking through tensions and spatial relationships.

## Core Prompt Structure

### Phase 1: Initial Response
```
Given this [question/prompt/article]:
[CONTENT]

Provide your initial thoughts and analysis.
```

### Phase 2: Perspective Exploration
```
Now explore this question through the following perspective frame:

        [Concept NW]            [Concept NE]
              \                    /
               \                  /
        [Concept W] - CENTER - [Concept E]
               /                  \
              /                    \
        [Concept SW]            [Concept SE]

For each tension (opposite pairs):
1. How does viewing through [NW] vs [SE] lens change your understanding?
2. How does viewing through [NE] vs [SW] lens reveal new insights?
3. How does viewing through [W] vs [E] lens challenge your assumptions?

For each neighbor relationship:
1. How do [NW] and [NE] complement each other in addressing this?
2. How do [NE] and [E] work together?
3. How do [E] and [SE] reinforce each other?
4. How do [SE] and [SW] create productive friction?
5. How do [SW] and [W] balance each other?
6. How do [W] and [NW] complete the circle?

Finally, how does the CENTER concept unify these perspectives?
```

## Example: Using the Culture Perspective

### The Prompt Template
```
Question: "Should we prioritize shipping features quickly or building robust systems?"

Phase 1: Initial Response
[AI provides natural response]

Phase 2: Culture Perspective Exploration

        Systems Thinking        Revolution
              (NW)                (NE)
                \                  /
                 \                /
    Human-first --- CULTURE --- AI-first
        (W)                        (E)
                 /                \
                /                  \
         Humility              Materialism
           (SW)                   (SE)

TENSIONS TO EXPLORE:
1. Systems Thinking ↔ Materialism
   - How does long-term architecture conflict with immediate delivery?
   - Where do these perspectives find common ground?

2. Revolution ↔ Humility  
   - How does the drive to transform clash with recognizing limits?
   - What wisdom emerges from this tension?

3. Human-first ↔ AI-first
   - How do human needs and AI capabilities create different priorities?
   - Where do they align?

NEIGHBOR SYNERGIES:
1. Systems Thinking + Revolution
   - How does systematic change enable true transformation?
   
2. Revolution + AI-first
   - How do AI capabilities enable revolutionary approaches?

[... continue for all neighbors ...]

SYNTHESIS:
How does CULTURE as the unifying center help resolve this question?
```

## Prompt Engineering Guidelines

### 1. Frame Selection
Choose perspectives based on the question type:
- **Strategic questions** → Mission perspective
- **Team/process questions** → Culture perspective  
- **Governance/decision questions** → Politics perspective
- **Complex questions** → Multiple perspectives

### 2. Tension Exploration
For each opposing pair:
- First acknowledge the tension
- Explore how each pole would approach the question
- Look for synthesis or creative resolution
- Avoid false compromises - some tensions are productive

### 3. Neighbor Relationships
For adjacent concepts:
- Identify natural collaborations
- Explore emergent properties
- Find reinforcing dynamics
- Discover unexpected connections

### 4. Center Integration
The center concept should:
- Unify without eliminating tensions
- Provide coherence to the exploration
- Suggest actionable synthesis
- Maintain the creative friction

## Advanced Patterns

### Multi-Level Exploration
```
1. Apply perspective to the question
2. Apply perspective to your own initial answer
3. Apply perspective to the perspective itself (meta-level)
```

### Cascading Perspectives
```
Question → Culture lens → Mission lens → Politics lens → Integration
```
Each perspective builds on insights from the previous.

### Adversarial Perspectives
```
Question → Culture says X → Politics challenges X → Mission mediates
```
Use different perspectives to debate each other.

### Dynamic Perspective Generation
```
Based on [question domain], generate a relevant hexagonal perspective with:
- 3 pairs of creative tensions
- Meaningful neighbor relationships
- A unifying center concept
```

## Implementation in Hexframe

In the Hexframe UI, this would work as:

1. **User asks open question** (creates center tile)
2. **User drags perspective frame** onto question
3. **AI generates initial response**
4. **AI explores through perspective** (visible process)
5. **User sees enriched analysis** with reasoning trace

The spatial arrangement makes the thinking process visual and interactive:
- Click on any tension to see that exploration
- Highlight neighbor relationships to see synergies
- Center tile shows the synthesis

## Benefits of This Approach

1. **Structured Creativity**: Systematic exploration without constraining possibilities
2. **Transparent Reasoning**: Users see how AI arrives at insights
3. **Reduced Bias**: Multiple lenses counter single-perspective thinking
4. **Teachable Process**: Users learn to think through perspectives
5. **Customizable Depth**: Can be simple or deeply analytical

## Future Enhancements

1. **Perspective Libraries**: Pre-built perspectives for different domains
2. **Perspective Composition**: Combine multiple frames for mega-perspectives
3. **Interactive Exploration**: Users guide which tensions to explore deeper
4. **Perspective Learning**: AI learns new perspectives from usage patterns
5. **Collaborative Perspectives**: Multiple AIs taking different positions

The Creative Workflow transforms open-ended questions from single-shot responses into rich, multi-dimensional explorations that users can see, understand, and guide.