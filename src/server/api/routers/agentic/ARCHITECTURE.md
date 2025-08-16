# Architecture: Agentic Router

## Overview
See [README.md](./README.md) for why this subsystem exists.

## Internal Structure

```
agentic/
├── interface.ts       # Public API
├── dependencies.json  # Allowed imports
├── README.md         # Subsystem purpose
├── ARCHITECTURE.md   # This file
└── agentic.ts        # Main router implementation
```

## Key Patterns
- **tRPC Router Pattern**: Defines typed RPC endpoints
- **Rate Limiting**: Verification-aware rate limiting for AI requests
- **Queue Pattern**: Returns job IDs for async processing
- **Polling Pattern**: Job status endpoint for checking completion

## Dependencies

| Dependency | Purpose |
|------------|---------|
| zod | Input validation schemas |
| @trpc/server | tRPC framework |
| ~/server/api/trpc | tRPC configuration and procedures |
| ~/server/api/middleware/rate-limit | Rate limiting middleware |
| ~/lib/domains/agentic/interface | Agentic domain services |
| ~/app/map/Services/EventBus | Event bus for real-time updates |
| ~/server/db | Database access for job results |
| drizzle-orm | Database query builder |
| ~/env | Environment configuration |

## Interactions

### Inbound (Who uses this subsystem)
- **Frontend Chat Component** → Calls generate and getJobStatus endpoints
- **tRPC Client** → Makes typed API calls

### Outbound (What this subsystem uses)
- **Agentic Domain** ← Creates agentic service for LLM operations
- **Database** ← Queries job results
- **Rate Limiter** ← Enforces API limits

## TO BE IMPROVED
- Add streaming support for real-time responses
- Implement better error recovery for failed jobs
- Add cost tracking per user