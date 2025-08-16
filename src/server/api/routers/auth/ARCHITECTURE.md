# Architecture: Auth Router

## Overview
See [README.md](./README.md) for why this subsystem exists.

## Internal Structure

```
auth/
├── interface.ts       # Public API
├── dependencies.json  # Allowed imports
├── README.md         # Subsystem purpose
├── ARCHITECTURE.md   # This file
└── auth.ts           # Router implementation
```

## Key Patterns
- **Session Management**: Retrieves and validates user sessions
- **Public Procedures**: Auth checks don't require authentication

## Dependencies

| Dependency | Purpose |
|------------|---------|
| ~/server/api/trpc | tRPC configuration |
| ~/server/auth | Better-auth instance |

## Interactions

### Inbound (Who uses this subsystem)
- **Frontend Auth Components** → Check session state
- **Root Router** → Mounts this router

### Outbound (What this subsystem uses)
- **Better-auth** ← For session management
- **tRPC Context** ← For user data

## TO BE IMPROVED
- Add refresh token endpoints
- Implement session invalidation
- Add multi-factor auth support