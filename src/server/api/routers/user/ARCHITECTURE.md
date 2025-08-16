# Architecture: User Router

## Overview
See [README.md](./README.md) for why this subsystem exists.

## Internal Structure

```
user/
├── interface.ts       # Public API
├── dependencies.json  # Allowed imports
├── README.md         # Subsystem purpose
├── ARCHITECTURE.md   # This file
└── user.ts           # Router implementation
```

## Key Patterns
- **Service Middleware**: Injects IAM and Mapping services
- **Cross-Domain Orchestration**: Coordinates user and map creation

## Dependencies

| Dependency | Purpose |
|------------|---------|
| zod | Input validation |
| ~/server/api/trpc | tRPC configuration |
| ~/lib/domains/iam/interface | IAM domain for user operations |
| ~/lib/domains/mapping/interface | Mapping domain for default map creation |

## Interactions

### Inbound (Who uses this subsystem)
- **Frontend Registration/Profile Components** → User operations
- **Root Router** → Mounts this router

### Outbound (What this subsystem uses)
- **IAM Domain** ← User registration and management
- **Mapping Domain** ← Default map creation
- **Service Middleware** ← Service injection

## TO BE IMPROVED
- Add user preferences endpoints
- Implement account deletion
- Add email verification flow