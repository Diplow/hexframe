# Specialized Agent: Migrate Single ARCHITECTURE.md to README.md

## Your Task
You are a specialized agent responsible for migrating ONE subsystem's documentation from ARCHITECTURE.md to README.md following the new structure.

## Process (MUST FOLLOW IN ORDER)

### 1. Understand the Subsystem Through Code
**DO NOT trust existing documentation - verify everything in code**

a) **Read the index.ts file** (if it exists)
   - What does this subsystem export?
   - What is the public API?

b) **Read key implementation files**
   - Look at the main files (not test files)
   - Understand what this subsystem ACTUALLY does
   - Identify the core responsibility

c) **List all child directories**
   - Use `ls -la` to see ALL subdirectories
   - Note which ones are subsystems (have their own dependecies.json file)

d) **Read child subsystem README.md files** (if they exist)
   - Only to understand what children handle
   - This helps define non-responsibilities

e) **Check dependencies.json**
   - What can this subsystem import? (you need to also check the parent's dependencies.json's "allowedChildren" field)
   - This reveals what it depends on

### 2. Form Your Understanding
Based on CODE (not existing docs), determine:

- **What is the mental model?** Think of a concrete allegory
  - Bad: "manages data" → Good: "like a library card catalog"
  - Bad: "handles events" → Good: "like a postal system"

- **What are the core responsibilities?** (3-5 bullets)
  - What does this subsystem actually DO?
  - Look at the exported functions/classes

- **What are the non-responsibilities?**
  - MUST list every child directory as a non-responsibility
  - What does this delegate to other subsystems?

### 3. Write the New README.md
Follow this EXACT structure from docs/README-STRUCTURE.md:

```markdown
# [Subsystem Name]

## Mental Model
[One sentence with concrete allegory]

## Responsibilities
- [Specific responsibility from code]
- [Another specific responsibility]
- [Another specific responsibility]

## Non-Responsibilities
[MUST include ALL child subsystems]
- [Thing it doesn't do] → See `path/to/responsible/README.md`
- [Child subsystem 1] → See `./child1/README.md`
- [Child subsystem 2] → See `./child2/README.md`

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.
```

### 4. Delete the ARCHITECTURE.md
```bash
rm [path]/ARCHITECTURE.md
```

### 5. Verify Your Work
- Run `ls` to confirm ARCHITECTURE.md is deleted
- Read the new README.md to ensure it's complete
- Check that ALL child directories are mentioned in non-responsibilities

## Critical Rules

1. **NEVER trust existing documentation blindly** - Always verify in code
2. **Read code FIRST, documentation SECOND**
3. **Mental model must be concrete** - Use real-world allegories
4. **Every child directory must appear in non-responsibilities**
5. **Keep it to ONE page maximum**
6. **Focus on WHAT, not HOW**
