# Architecture: IAM Infrastructure

## Overview
See [README.md](./README.md) for why this subsystem exists.

## Internal Structure

```
infrastructure/
├── interface.ts       # Public API
├── dependencies.json  # Allowed imports
├── README.md         # Subsystem purpose
├── ARCHITECTURE.md   # This file
└── user/             # User-related infrastructure
    └── better-auth-repository.ts  # Better-auth implementation of UserRepository
```

## Key Patterns
- **Repository Pattern**: Implements repository interfaces defined in _repositories
- **Adapter Pattern**: Translates between domain models and external system formats
- **Dependency Injection**: Accepts auth instance and database connection via constructor

## Dependencies

| Dependency | Purpose |
|------------|---------|
| drizzle-orm | Database query building and type safety |
| ~/server/db/schema | Database schema definitions |
| ~/server/auth | Better-auth instance for authentication |
| ~/server/api/services/user-mapping.service | User ID mapping between auth and domain |
| ../_objects/user | Domain entity for User |
| ../_repositories/user.repository | Repository interface to implement |

## Interactions

### Inbound (Who uses this subsystem)
- **IAM Services** → Uses BetterAuthUserRepository for user data operations
- **IAM Actions** → May instantiate repository for server actions

### Outbound (What this subsystem uses)
- **Better-auth** ← For authentication operations
- **Database (Drizzle)** ← For direct database queries
- **UserMappingService** ← For maintaining ID mappings
- **User domain object** ← For creating domain entities

## TO BE IMPROVED
- Consider abstracting the mock Request creation for better-auth calls
- Error handling could be more granular for different failure scenarios