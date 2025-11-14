# Hexframe: Building Systems

A tool for creating and evolving AI systems. See [What is a System?](./src/app/SYSTEM.md)

## Evolution of a System

### Level 1: Structured Prompt
Start with a center concept and up to 6 key parts:
```text
Issue Planning
├── Define Problem
├── Gather Context  
├── Explore Solutions
├── Choose Approach
├── Design Architecture
└── Review Plan
```

### Level 2: Nested Systems
Any part can become its own system:
```text
Gather Context
├── Find Related Files
├── Check Documentation
├── Review Past Issues
├── Identify Dependencies
├── Map Current State
└── List Assumptions
```

### Level 3: System Interactions
Systems start talking to each other:
- The "Review Plan" system might call the "Code Quality Check" system
- The "Find Related Files" might use the "Codebase Navigator" system
- Systems compose, challenge, and enhance each other

## Current Use
- **User**: [Me, dogfooding it](./USER.md)
- **Goal**: [Claude integration for planning](./GOAL.md)
- **Reality**: Building the tool with the tool