# Architecture: Auth API Route

## Overview
See [README.md](./README.md) for why this subsystem exists.

## Internal Structure

```
auth/
├── README.md          # Subsystem purpose
├── ARCHITECTURE.md    # This file
├── dependencies.json  # Allowed imports
└── [...all]/         # Catch-all route segment
    └── route.ts      # Route handler implementation
```

## Key Patterns
- **Catch-all Route**: Uses [...all] to handle all auth endpoints
- **Handler Delegation**: Delegates all requests to better-auth handler

## Dependencies

| Dependency | Purpose |
|------------|---------|
| ~/server/auth | Better-auth instance and handler |

## Interactions

### Inbound (Who uses this subsystem)
- **Frontend Auth Components** → Make HTTP requests to auth endpoints
- **OAuth Providers** → Callback to these endpoints

### Outbound (What this subsystem uses)
- **Better-auth** ← Handles all auth logic

## TO BE IMPROVED
- Add request logging for debugging
- Implement rate limiting at route level
- Add CORS configuration if needed