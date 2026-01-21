---
description: Guide domain layer development following DDD patterns
argument-hint: <domain-name> [action: add-service|add-action|add-entity|review]
allowed-tools: Read, Edit, Write, Glob, Grep, Bash(pnpm:*)
---

# Domain Layer Development

You are a Domain-Driven Design specialist. Your job is to help develop domain layer code that follows this project's strict architectural patterns.

## Arguments

- **Domain**: $1 (e.g., "mapping", "iam", "agentic")
- **Action**: $2 (optional: "add-service", "add-action", "add-entity", "review")

## Step 1: Read Domain Context

First, read the domain architecture documentation:
- `src/lib/domains/README.md` - Domain architecture overview
- `src/lib/domains/$1/README.md` - Specific domain documentation (if exists)

Then examine the existing domain structure:
```bash
ls -la src/lib/domains/$1/
```

## Step 2: Understand Domain Layer Structure

Each domain follows this layered architecture:

| Layer | Directory | Purpose | Rules |
|-------|-----------|---------|-------|
| **Entities** | `_objects/` | Core business objects | Immutable, no infra deps, enforce business rules |
| **Actions** | `_actions/` | Business logic & use cases | Pure operations, no DB access, work with entities |
| **Services** | `services/` | Public API facade | Entry point, orchestrate actions, use repositories |
| **Repositories** | `_repositories/` | Data access interfaces | Abstract persistence, return entities not records |
| **Infrastructure** | `infrastructure/` | Technical implementations | Drizzle implementations, adapters, hidden from domain |
| **Types** | `types/` | DTOs & contracts | `contracts.ts`, `errors.ts`, `constants.ts` |

## Step 3: Critical Rules

### DOMAIN INDEPENDENCE (CRITICAL)

**Domains MUST NOT depend on or call other domains directly.**

```typescript
// ❌ WRONG: Domain calling another domain
import { mappingService } from '~/lib/domains/mapping';
await mappingService.createMap(userId); // VIOLATION

// ✅ CORRECT: Orchestration happens at API layer (tRPC routers)
```

### Layer Dependencies (Top to Bottom)

```
services/ → _actions/ → _objects/
    ↓           ↓
_repositories/ (interfaces)
    ↓
infrastructure/ (implementations)
```

- Services call actions and repositories
- Actions work with entities and value objects
- Infrastructure implements repository interfaces
- Lower layers NEVER depend on higher layers

### Naming Conventions

- Entities: `user.ts`, `map-item.ts` (noun)
- Actions: `authenticate.ts`, `manage-users.ts` (verb or verb-noun)
- Services: `iam.service.ts`, `mapping.service.ts`
- Repositories: `user.repository.ts`
- Internal folders: Prefix with `_` (e.g., `_objects/`, `_actions/`)

## Step 4: Execute Based on Action

### If $2 = "add-entity" or adding an entity

1. Create in `src/lib/domains/$1/_objects/`:
   - Entity class with domain validation
   - Factory function for creation
   - Immutable design (readonly properties or private setters)

2. Export from `_objects/index.ts`

### If $2 = "add-action" or adding business logic

1. Create in `src/lib/domains/$1/_actions/`:
   - Pure function taking entities/values as input
   - Returns domain result (entity, success/failure)
   - NO database calls, NO service imports

2. Export from `_actions/index.ts`

### If $2 = "add-service" or adding a service method

1. Add to `src/lib/domains/$1/services/$1.service.ts`:
   - Inject repositories via constructor
   - Call actions for business logic
   - Transform to/from contracts at boundaries

2. If new repository method needed:
   - Add interface in `_repositories/`
   - Implement in `infrastructure/`

### If $2 = "review" or no specific action

Review the domain for architectural violations:

1. **Cross-domain imports**: Grep for imports from other domains
   ```bash
   grep -r "from '~/lib/domains/" src/lib/domains/$1/ | grep -v "$1"
   ```

2. **Layer violations**: Check if lower layers import higher layers
3. **Missing abstractions**: Direct DB access in services or actions
4. **Public API surface**: Services should be the only public entry point

## Step 5: Verification

After changes, run verification:

```bash
pnpm check:lint && pnpm typecheck
```

If tests exist for the domain:
```bash
pnpm test src/lib/domains/$1/
```

## Step 6: Document Changes

If you made structural changes:
- Update `src/lib/domains/$1/README.md` if it exists
- Ensure new exports are in appropriate `index.ts` files

## Example Patterns

### Entity Pattern
```typescript
// src/lib/domains/iam/_objects/user.ts
export interface User {
  readonly id: string;
  readonly email: string;
  readonly createdAt: Date;
}

export function createUser(props: CreateUserInput): User {
  // Validation logic here
  return { ...props, createdAt: new Date() };
}
```

### Action Pattern
```typescript
// src/lib/domains/iam/_actions/validate-credentials.ts
export function validateCredentials(
  user: User,
  password: string,
  hashedPassword: string
): ValidationResult {
  // Pure business logic, no DB calls
}
```

### Service Pattern
```typescript
// src/lib/domains/iam/services/iam.service.ts
export class IAMService {
  constructor(private readonly repos: { user: UserRepository }) {}

  async authenticate(input: AuthInput): Promise<AuthResult> {
    const user = await this.repos.user.findByEmail(input.email);
    return validateCredentials(user, input.password, user.hashedPassword);
  }
}
```

## Key Principles

1. **Entities are the truth**: Business rules live in entities and actions
2. **Services orchestrate**: Services combine actions and repositories
3. **Infrastructure is hidden**: Domain logic never knows about Drizzle/DB
4. **Test in isolation**: Mock repositories, test domain logic purely
5. **Transform at boundaries**: Use contracts (DTOs) for API communication
