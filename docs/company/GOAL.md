# Goal: Perspective-Enhanced Feature Planning

Enable AI-powered feature planning that leverages custom perspectives for deeper analysis:

```
claude plan --system hexframe:feature-planning-perspectives
```

## Core Workflow Structure

The feature planning workflow consists of tasks (tiles) and sub-workflows (frames) enhanced with custom perspectives:

```
                 Gather Context              Define Problem
                 (+ Architecture            (+ User Impact
                    Perspective)               Perspective)
                       \                          /
                        \                        /
           Validate ----  FEATURE PLANNING  ---- Ideate
         Requirements                           Solutions
       (+ Principles                         (+ Innovation
          Perspective)                          Perspective)
                        /                        \
                       /                          \
              Architect                     Plan Implementation
            (+ Technical                      (+ Execution
               Perspective)                      Perspective)
```

## How Perspectives Enhance Each Step

### 1. Gather Context (with Architecture Perspective)
Instead of just collecting information, the AI explores the codebase through architectural tensions:
- **Modularity ↔ Integration**: How isolated vs interconnected should this feature be?
- **Flexibility ↔ Simplicity**: Over-engineering vs under-engineering
- **Performance ↔ Maintainability**: Speed vs code clarity

### 2. Define Problem (with User Impact Perspective)
Beyond problem statement, explore through user-centric tensions:
- **Power Users ↔ New Users**: Advanced features vs accessibility
- **Individual ↔ Collaborative**: Personal workflow vs team features
- **Current Pain ↔ Future Vision**: Solving today's problems vs tomorrow's

### 3. Ideate Solutions (with Innovation Perspective)
Generate ideas through creative tensions:
- **Novel ↔ Proven**: Cutting-edge vs battle-tested approaches
- **Elegant ↔ Pragmatic**: Beautiful solutions vs quick wins
- **Transformative ↔ Incremental**: Big changes vs small improvements

### 4. Architect (with Technical Perspective)
Design through technical tensions:
- **Abstraction ↔ Concreteness**: Generic solutions vs specific implementations
- **Local ↔ Global**: Component changes vs system-wide impact
- **Synchronous ↔ Asynchronous**: Real-time vs eventual consistency

### 5. Validate Requirements (with Principles Perspective)
Verify through core principles:
- **Rule of 6 ↔ Completeness**: Simplicity vs thoroughness
- **User Agency ↔ AI Automation**: Control vs convenience
- **Transparency ↔ Abstraction**: Visible complexity vs hidden magic

### 6. Plan Implementation (with Execution Perspective)
Plan through delivery tensions:
- **Speed ↔ Quality**: Ship fast vs ship right
- **Risk ↔ Reward**: Safe path vs high-impact path
- **Learning ↔ Delivery**: Exploration vs execution

## The Creative Workflow in Action

When the AI encounters an open question at any step, it:

1. **Generates initial response** based on context
2. **Applies relevant perspective** to challenge assumptions
3. **Explores tensions** to find nuanced solutions
4. **Synthesizes insights** into actionable recommendations

## Example Usage

```bash
claude plan --system hexframe:feature-planning-perspectives --feature "Add real-time collaboration"
```

The system would:
1. Load the feature planning workflow with all perspectives
2. Guide through each step, applying perspectives for deeper analysis
3. Make reasoning transparent through tension exploration
4. Produce richer, more thoughtful planning artifacts

## Benefits

- **Deeper Analysis**: Every step benefits from multi-angle exploration
- **Reduced Blind Spots**: Perspectives surface hidden assumptions
- **Transparent Reasoning**: See how AI reaches conclusions
- **Customizable Thinking**: Swap perspectives for different domains
- **Better Decisions**: Tensions reveal trade-offs explicitly

The goal is to transform feature planning from a linear checklist into a rich, multi-dimensional exploration that produces better outcomes through structured creative thinking.