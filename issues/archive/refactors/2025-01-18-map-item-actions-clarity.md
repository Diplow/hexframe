# Refactor Session: map-item.actions.ts Clarity

**Date**: 2025-01-18
**Target**: `src/lib/domains/mapping/_actions/map-item.actions.ts`
**Status**: Completed

## Pre-Refactoring Analysis

### File Overview
- **Current size**: 299 lines
- **Class**: `MapItemActions` with 7 public methods and 5 private methods
- **Main method**: `moveMapItem` (104 lines - significantly exceeds 50 line guideline)
- **Purpose**: Orchestrates map item operations (create, update, remove, move, query)

### Current Concepts

#### Existing Domain Concepts
From mapping domain:
- `MapItemRepository` - data access for map items
- `BaseItemRepository` - data access for base items
- `MapItemWithId` - map item entity
- `BaseItemWithId` - base item entity
- `MapItemType` - enum for item types
- `Coord` - coordinate system type
- `MapItemIdr` - identifier type
- `DatabaseTransaction` - transaction support

Helper classes:
- `MapItemCreationHelpers` - handles item creation
- `MapItemQueryHelpers` - handles item queries
- `MapItemMovementHelpers` - handles item movement

#### Identified New Concepts

1. **TransactionScope** (implicit)
   - **What**: Manages repository instances for transactional operations
   - **Why**: Ensures all operations within a transaction use the same scope
   - **Current**: Complex inline logic in moveMapItem (lines 97-106)

2. **MoveStrategy** (implicit)
   - **What**: Determines if operation is a simple move or a swap
   - **Why**: Different execution paths for moves vs swaps
   - **Current**: Implicit boolean check with conditional logic

3. **MoveResult** (implicit)
   - **What**: Structured result of a move operation
   - **Why**: Consistent return format for move operations
   - **Current**: Anonymous object return

4. **ItemHierarchyManager** (implicit)
   - **What**: Manages parent-child relationships during operations
   - **Why**: Ensures hierarchy consistency
   - **Current**: Scattered across multiple methods

5. **ValidationStrategy** (implicit)
   - **What**: Validates move operations based on item type and coordinates
   - **Why**: Enforces business rules for different item types
   - **Current**: Split across two validation methods

### Rule of 6 Violations

1. **Class too large**: 12 methods (7 public + 5 private) exceeds 6
2. **moveMapItem method**: 104 lines (should be max 50)
3. **Too many responsibilities**: CRUD + movement + validation + hierarchy
4. **Complex conditional logic**: Transaction handling mixed with business logic
5. **Nested complexity**: Deep nesting in moveMapItem method

### Clarity Issues

1. **Mixed abstraction levels**: Low-level repository calls mixed with high-level orchestration
2. **Unclear separation**: Move vs swap logic intertwined
3. **Transaction handling**: Complex inline logic obscures main flow
4. **Error handling**: Inconsistent patterns (some try-catch, some throws)
5. **Helper usage**: Some operations use helpers, others direct repository calls

### Proposed Structure

Following the Rule of 6 and domain-driven design:

```
map-item-actions/
├── types.ts                    # Shared types and interfaces
├── transaction-scope.ts        # Transaction scope management
├── validation-strategy.ts      # Move validation rules
├── move-orchestrator.ts        # High-level move coordination
├── crud-operations.ts          # Create, update, remove operations
├── query-operations.ts         # Query operations
└── index.ts                   # Main MapItemActions class (thin facade)
```

### Questions for Validation

1. Should we split MapItemActions into separate services (e.g., MapItemCrudService, MapItemMoveService)?
2. Is the transaction scope pattern useful for other operations beyond move?
3. Should validation be a separate concern or embedded in operations?
4. Would a MoveResult type improve API consistency?
5. Should we extract a HierarchyManager for descendant operations?

## User Validation

User approved proceeding with the refactoring without splitting into separate services.

## Refactoring Results

### New Structure Created

```
map-item-actions/
├── index.ts                    # Main MapItemActions class (thin facade)
├── move-orchestrator.ts        # High-level move coordination
└── validation-strategy.ts      # Move validation rules
```

### Key Improvements

1. **Extracted Complex Logic**: The 104-line `moveMapItem` method is now split across:
   - `orchestrateMove()` - 29 lines for high-level coordination
   - `_executeSwapSequence()` - 31 lines for swap logic
   - `_executeSimpleMove()` - 12 lines for simple moves
   - `_collectModifiedItems()` - 17 lines for result collection

2. **Clear Abstractions**: Each module maintains single responsibility:
   - `ValidationStrategy` - All move validation rules
   - `MoveOrchestrator` - Move sequence coordination
   - Main class - Thin facade delegating to specialists

3. **Removed Console Logs**: All console.log statements removed as requested

4. **Maintained Compatibility**: External API unchanged, all tests pass

### Concepts Added to Canvas README

- **TransactionScope**: Repository transaction management pattern
- **MoveValidation**: Centralized validation rules
- **MoveOrchestrator**: 3-step move/swap sequence coordination

### Testing Results

- ✅ All unit tests pass
- ✅ All integration tests pass
- ✅ Linting passes
- ✅ Type checking passes