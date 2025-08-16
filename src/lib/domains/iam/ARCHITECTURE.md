# Architecture: IAM Domain

## Overview
See [README.md](./README.md) for why this domain exists.

## Internal Structure

```
iam/
├── interface.ts                # Public API
├── dependencies.json           # Allowed imports
├── README.md                  # Domain purpose
├── ARCHITECTURE.md            # This file
├── _objects/                  # Domain entities (internal)
│   ├── user.ts               # User entity with business logic
│   └── index.ts              # Entity exports
├── _repositories/             # Repository interfaces (internal)
│   ├── user.repository.ts    # UserRepository interface
│   └── index.ts              # Interface exports
├── infrastructure/            # External system adapters
│   └── user/                 # User infrastructure
│       └── better-auth-repository.ts  # Better-auth implementation
├── services/                  # Domain services
│   ├── iam.service.ts        # Core authentication service
│   └── index.ts              # Service exports
├── types/                     # Domain types
│   ├── contracts.ts          # API contracts
│   ├── errors.ts             # Domain-specific errors
│   └── index.ts              # Type exports
└── actions.ts                 # Server actions for Next.js
```

## Key Patterns
- **Domain-Driven Design**: Clear separation of domain logic from infrastructure
- **Repository Pattern**: Abstract data access through interfaces
- **Immutable Entities**: User entity creates new instances on update
- **Dependency Injection**: Services accept repositories via constructor
- **Server Actions**: Next.js server actions for form handling

## Dependencies

| Dependency | Purpose |
|------------|---------|
| zod | Input validation for actions |
| next/cache | Cache revalidation after mutations |
| ~/server/auth | Better-auth instance |
| ~/server/db | Database connection |
| ~/lib/domains/mapping | Cross-domain orchestration in actions |

## Interactions

### Inbound (Who uses this domain)
- **App Layer (auth pages)** → Uses server actions for login/register
- **tRPC API** → Uses IAMService via middleware
- **Other domains** → May reference User type for authorization

### Outbound (What this domain uses)
- **infrastructure subsystem** ← For repository implementations
- **Better-auth** ← Via infrastructure for authentication
- **UserMappingService** ← For ID translation
- **Mapping domain** ← Only in actions for default map creation

## TO BE IMPROVED
- Consider extracting cross-domain orchestration from actions to a separate orchestration layer
- Add more granular error types for different failure scenarios
- Implement authorization features (roles, permissions)