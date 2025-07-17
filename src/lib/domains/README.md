# Domains

A domain is a modelisation of a business environment following Domain-Driven Design (DDD) principles.

## Core Architectural Principles

### Domain Independence (CRITICAL)

**Domains MUST NOT depend on or call other domains directly.** This is a fundamental rule of our architecture:

- Each domain is completely isolated and self-contained
- Domains have no knowledge of other domains' existence
- Cross-domain orchestration happens exclusively at the API layer (tRPC routers)
- This ensures domains can evolve independently and be tested in isolation

```typescript
// ❌ WRONG: Domain calling another domain
class IAMService {
  async registerUser(input) {
    const user = await this.createUser(input);
    // DON'T DO THIS - IAM shouldn't know about mapping
    await this.mappingService.createDefaultMap(user.id); 
    return user;
  }
}

// ✅ CORRECT: Orchestration at API layer
// In tRPC router
export const userRouter = createTRPCRouter({
  register: publicProcedure
    .use(iamServiceMiddleware)
    .use(mappingServiceMiddleware)
    .mutation(async ({ ctx, input }) => {
      // API layer orchestrates multiple domains
      const user = await ctx.iamService.register(input);
      const map = await ctx.mappingService.createMap({ userId: user.id });
      return { user, map };
    })
});
```

## Domain Structure

Each domain follows a consistent layered architecture:

### Entities (`_objects/`)

Entities are the core business objects that model the domain's data and enforce business rules:
- Represent domain concepts with identity
- Contain domain validation logic
- Immutable by design
- No infrastructure dependencies

### Actions (`_actions/`)

Actions represent the domain's business logic and use cases:
- Pure business operations
- If you look at the actions of a domain, you should see an exhaustive list of what can be done
- Work with entities and value objects
- No direct database access

### Services (`services/`)

Services are the public API of the domain:
- Entry point for external callers (API layer)
- Orchestrate actions within the domain
- Use repositories for persistence
- Expose domain operations in a technology-agnostic way
- **NEVER call services from other domains**

### Repositories (`_repositories/`)

Repositories are pure interfaces that define the data access contract:
- Abstract persistence concerns
- Define queries needed by the domain
- Return domain entities, not database records
- Implemented by infrastructure layer

### Infrastructure (`infrastructure/`)

Concrete implementations of technical concerns:
- Repository implementations (e.g., using Drizzle ORM)
- External service adapters
- Transaction managers
- Completely hidden from domain logic

### Types (`types/`)

Domain-specific type definitions:
- `contracts.ts`: DTOs for API communication
- `errors.ts`: Domain-specific error types
- `constants.ts`: Domain constants and enums

### Utils (`utils/`)

Pure utility functions specific to the domain.

## Example Domain Structure

```
/src/lib/domains/iam/
├── README.md                 # Domain documentation
├── _objects/                 # Entities & Value Objects
│   ├── user.ts              # User entity
│   ├── user-profile.ts      # UserProfile value object
│   └── index.ts             # Public exports
├── _actions/                 # Business logic
│   ├── authenticate.ts      # Authentication use cases
│   ├── manage-users.ts      # User management use cases
│   └── index.ts
├── _repositories/           # Data access interfaces
│   ├── user.repository.ts   # User repository interface
│   └── index.ts
├── services/                # Domain services
│   ├── iam.service.ts       # Main service facade
│   ├── __tests__/           # Service integration tests
│   └── index.ts
├── infrastructure/          # Technical implementations
│   ├── user/
│   │   └── db.ts           # Drizzle repository implementation
│   └── transaction-manager.ts
├── types/                   # Domain types
│   ├── contracts.ts        # API contracts/DTOs
│   ├── errors.ts           # Domain errors
│   └── constants.ts        # Domain constants
└── utils/                   # Domain utilities
    └── validators.ts        # Validation helpers
```

## Testing Domains

Because domains are independent, they can be tested in complete isolation:

```typescript
describe('IAMService', () => {
  it('registers a user', async () => {
    const mockUserRepo = createMockUserRepository();
    const service = new IAMService({ user: mockUserRepo });
    
    const user = await service.register({
      email: 'test@example.com',
      password: 'secure123'
    });
    
    expect(user.email).toBe('test@example.com');
    expect(mockUserRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@example.com' })
    );
  });
});
```

## Best Practices

1. **Keep domains focused**: Each domain should have a single, clear responsibility
2. **No cross-domain imports**: Never import from another domain's internal modules
3. **Use contracts for API**: Transform domain objects to contracts at service boundaries
4. **Test in isolation**: Each domain should have comprehensive unit tests
5. **Document domain concepts**: Include a README in each domain explaining its purpose and key concepts
