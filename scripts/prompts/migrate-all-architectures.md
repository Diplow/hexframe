# Dispatcher: Migrate All ARCHITECTURE.md Files Bottom-Up

## Your Task
Coordinate the migration of all ARCHITECTURE.md files to README.md by dispatching specialized agents in the correct order (deepest first).

## Process

### 1. Find All ARCHITECTURE.md Files
```bash
find . -name "ARCHITECTURE.md" -type f | grep -v node_modules | sort
```

### 2. Determine Depth Order
Sort the files by depth (deepest first):
- Count the number of `/` in each path
- Process deepest paths first
- This ensures child READMEs are ready before parent migration

Example order:
1. `src/app/map/Chat/Timeline/Widgets/AIResponseWidget/ARCHITECTURE.md` (depth 6)
2. `src/app/map/Chat/Timeline/Widgets/ARCHITECTURE.md` (depth 5)
3. `src/app/map/Chat/Timeline/ARCHITECTURE.md` (depth 4)
4. `src/app/map/Chat/ARCHITECTURE.md` (depth 3)
5. `src/app/map/ARCHITECTURE.md` (depth 2)
6. `src/app/ARCHITECTURE.md` (depth 1)

### 3. Dispatch Agents for Each File

For each ARCHITECTURE.md file (starting from deepest):

```
Launch specialized agent with prompt:
"Migrate the documentation for [subsystem path] from ARCHITECTURE.md to README.md following scripts/prompts/migrate-single-architecture.md.
Start by reading the code to understand what this subsystem actually does."
```

**IMPORTANT**:
- Process them in SEQUENCE, not parallel
- Wait for each to complete before starting next
- This ensures child READMEs exist when parent needs them

### 4. Track Progress

Maintain a list:
```
✅ Completed: [path]
🔄 In Progress: [path]
⏳ Pending: [path], [path], [path]
```

### 5. Verify Final State

After all migrations:
```bash
# Should return nothing:
find . -name "ARCHITECTURE.md" -type f | grep -v node_modules

# Should pass:
pnpm check:architecture
```

## Example Execution

```
Finding all ARCHITECTURE.md files...
Found 35 files to migrate.

Starting bottom-up migration:

[1/35] Migrating: src/app/map/Chat/Timeline/Widgets/AIResponseWidget/
  → Launching specialized agent...
  → ✅ Complete

[2/35] Migrating: src/app/map/Chat/Timeline/Widgets/PreviewWidget/
  → Launching specialized agent...
  → ✅ Complete

[3/35] Migrating: src/app/map/Chat/Timeline/Widgets/
  → Launching specialized agent...
  → ✅ Complete

... continues ...
```

## Critical Rules

1. **MUST process bottom-up** - Deepest directories first
2. **MUST be sequential** - One at a time, not parallel
3. **MUST use the specialized agent** - Don't try to do it yourself
4. **MUST verify child READMEs exist** - Parents need to reference them

## Success Criteria

- All ARCHITECTURE.md files deleted
- All README.md files follow new structure
- All child subsystems referenced in parent non-responsibilities
- `pnpm check:architecture` passes
- No documentation refers to ARCHITECTURE.md anymore

## Handling Errors

If an agent fails:
1. Note which subsystem failed
2. Continue with others at the same depth
3. Report failures at the end
4. Suggest manual intervention for failed ones

## Final Report

Provide summary:
```
Migration Complete:
✅ 34/35 successful
❌ 1 failed: src/some/path/ - [reason]

All ARCHITECTURE.md files removed.
All README.md files updated to new structure.
```