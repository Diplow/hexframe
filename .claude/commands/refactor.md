# /refactor Command

This command instructs Claude to refactor a file for clarity according to the workflow and principles in `@.claude/commands/refactor-clarity.md`.

## Usage
```
/refactor <file_path>
```

## Prerequisites
- The file `.claude/commands/refactor-clarity.md` must exist (the command will check for it)
- The target file must exist and be a valid file

## What it does
The command directs Claude to follow the complete workflow from `@.claude/commands/refactor-clarity.md`:

1. Creates a refactor session document in `issues/YYYY-MM-DD-<filename>-clarity.md`
2. Performs pre-refactoring analysis (sections 284-340 of the guide)
3. Presents findings for validation (sections 317-336)
4. Waits for user approval
5. Executes the complete refactoring (following all principles in the guide)
6. Updates the session document with results

## Example
```
/refactor src/app/map/create/create-item.tsx
```

This will:
- Create `issues/2025-01-18-create-item-clarity.md`
- Analyze the file following the guide's methodology
- Present findings and wait for validation
- Apply the refactoring after approval

## Error Handling
The command will exit with an error if:
- `.claude/commands/refactor-clarity.md` is not found
- No file path is provided
- The specified file doesn't exist
- The specified path is not a file

## Reference
All principles, workflow steps, and examples are documented in `@.claude/commands/refactor-clarity.md`. The command explicitly references this guide rather than duplicating its content.