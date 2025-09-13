# Actions Subsystem Architecture

The Actions subsystem orchestrates domain operations through specialized helper classes and transaction management. It provides the command layer for the mapping domain, handling complex operations that span multiple repositories and require business logic coordination.

## Purpose

This subsystem acts as the orchestration layer between the domain services and the repository layer, ensuring that:
- Complex operations are broken down into manageable, testable units
- Transaction boundaries are properly managed
- Business rules are enforced consistently
- Helper classes provide focused responsibilities

## Internal Structure

### Core Components

- **`MapItemActions`** - Main orchestrator class that coordinates all map item operations
- **Helper Classes** - Specialized classes for focused responsibilities:
  - `MapItemCreationHelpers` - Handles item creation and updates
  - `MapItemQueryHelpers` - Manages data retrieval operations
  - `MapItemMovementHelpers` - Handles item movement and spatial operations
- **Orchestration Components** - Advanced coordination:
  - `MoveOrchestrator` - Coordinates complex move operations
  - `ValidationStrategy` - Encapsulates validation logic

### File Organization

```
_actions/
├── index.ts                              # Public API
├── map-item.actions.ts                   # Legacy main actions class
├── map-item-actions/                     # New modular structure
│   ├── index.ts                         # Enhanced actions class
│   ├── move-orchestrator.ts             # Move operation coordination
│   └── validation-strategy.ts           # Validation logic
├── _map-item-creation-helpers.ts        # Creation operations
├── _map-item-query-helpers.ts           # Query operations
├── _map-item-movement-helpers.ts        # Movement operations
└── __tests__/                           # Unit tests
    └── map-item-transactions.test.ts
```

## Design Patterns

### Command Pattern
Actions classes encapsulate operations as discrete, executable commands with clear inputs and outputs.

### Helper Pattern
Complex operations are decomposed into specialized helper classes, each with focused responsibilities following the Single Responsibility Principle.

### Transaction Management
Actions coordinate with the infrastructure layer to ensure data consistency across multiple repository operations.

### Strategy Pattern
Validation and orchestration logic is encapsulated in strategy classes for flexibility and testability.

## Dependencies

### Internal Dependencies
- `_objects` - Domain entities and value objects
- `_repositories` - Data access interfaces
- `types` - Type definitions and contracts
- `utils` - Coordinate utilities and spatial calculations
- `services` - Business logic services
- `infrastructure` - Transaction management

### External Dependencies
- `vitest` - Testing framework (test files only)

## Integration Points

### Inbound
- Domain services consume actions for complex operations
- API layers use actions for request handling
- Test suites verify action behavior

### Outbound
- Repository interfaces for data persistence
- Infrastructure services for transaction management
- Utility functions for coordinate calculations

## Architecture Principles

### Single Level of Abstraction
Each action method operates at a consistent abstraction level, delegating detailed work to appropriate helpers.

### Rule of 6 Compliance
- Helper classes are focused on specific operation types (create, query, move)
- Methods are kept focused and delegate to helpers when complexity grows
- Dependencies are injected to maintain testability

### Transaction Boundaries
Actions coordinate transaction boundaries appropriately:
- Simple operations use repository-level transactions
- Complex operations coordinate explicit transaction management
- Helper classes can work within provided transaction contexts

## Testing Strategy

Actions are unit tested with mocked dependencies to verify:
- Correct orchestration of helper classes
- Proper transaction boundary management
- Error handling and validation logic
- Business rule enforcement

Integration tests verify end-to-end operation flows through the full domain stack.