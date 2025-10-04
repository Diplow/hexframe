# Walkthrough Command

## Purpose
Systematically investigate a problem by walking through the code step-by-step, building a clear mental model of how things work and identifying potential issues without immediately fixing them.

## Command
```
/walkthrough "problem description"
```

## Process

### 1. Problem Statement
- Clearly restate the problem
- Identify observable symptoms
- Note what works vs what doesn't work

### 2. Initial Assumptions
- State what parts of the codebase are likely relevant
- State what parts are likely NOT relevant
- Explain reasoning for these assumptions

### 3. Code Investigation
Walk through the code systematically, starting broad and narrowing down:

#### Investigation Layers:
1. **Integration Layer**: How is the component used?
   - Where is it imported and rendered?
   - What props/context does it receive?
   - What's the component hierarchy?

2. **Component Layer**: How does the component work?
   - Overall structure and organization
   - State management and interactions
   - Subcomponents and their relationships

3. **Implementation Layer**: Specific feature implementation
   - How is the specific feature (e.g., styling) implemented?
   - What utilities/helpers are used?
   - Dependencies and assumptions

4. **Detail Layer**: Deep dive into problem area
   - Specific classes/styles/logic
   - Edge cases and special handling

#### For each file/component:
1. **Purpose**: What is this supposed to do?
2. **Structure**: How is it organized?
3. **Key Logic**: How does it work? (focus on problem-relevant parts)
4. **Dependencies**: What does it depend on?
5. **Potential Issues**: Flag anything suspicious (but don't fix yet)

#### Progressive Narrowing:
- Start from where the component is used (page level)
- Move to the component itself
- Then to specific features
- Finally to implementation details
- At decision points, ask: "Should we explore [X] or note it for later?"

### 4. Interactive Exploration
When reaching branches in investigation:
```
"We have two paths here:
A) Investigate how [component X] handles [behavior Y]
B) Check if [component Z] might be interfering

Would you like to explore one of these now, or should I note them and continue with [current path]?"
```

### 5. Building Understanding
As we go, maintain:
- **Working Theory**: Current understanding of how things work
- **Questions**: Things that need clarification
- **Anomalies**: Things that don't match expectations

### 6. Final Summary

#### How It Works
- Clear explanation of the relevant system
- Flow diagram if helpful
- Key components and their responsibilities

#### Potential Issues Identified
1. **Issue**: [Description]
   - **Location**: [File:line]
   - **Why Suspicious**: [Reasoning]
   - **Impact**: [How it might cause the problem]

2. **Issue**: [Description]
   ...

#### Recommended Investigation Order
Prioritized list of what to investigate/fix first

## Example Usage

```
/walkthrough "In dark mode, the focus ring on toolbox buttons is invisible"
```

Would lead to:
1. Examining how focus rings are styled
2. Checking CSS variable definitions
3. Investigating Tailwind class generation
4. Looking for overflow/clipping issues
5. Comparing with working focus rings elsewhere

## Key Principles

1. **Don't Fix During Walkthrough**: Just observe and document
2. **Ask for Direction**: When multiple paths exist, ask the user
3. **State Assumptions**: Be explicit about what you're assuming
4. **Focus on Understanding**: Build a mental model before solutions
5. **Document Everything**: Keep a clear trail of investigation

## Output Format

The walkthrough should produce:
1. A clear understanding of how the system works
2. A list of potential issues with evidence
3. A recommended path forward
4. Questions that need answers

This systematic approach helps avoid:
- Jumping to conclusions
- Missing important context
- Fixing symptoms instead of causes
- Creating new issues while fixing old ones