# Architecture: Agentic Infrastructure

## Overview
See [README.md](./README.md) for why this subsystem exists.

## Internal Structure

```
infrastructure/
├── interface.ts          # Public API
├── dependencies.json     # Allowed imports
├── README.md            # Subsystem purpose
├── ARCHITECTURE.md      # This file
├── inngest/             # Queue infrastructure
│   ├── client.ts       # Inngest client setup
│   └── functions.ts    # Background job definitions
└── openrouter/          # OpenRouter-specific infrastructure (if any)
```

## Key Patterns
- **Queue Pattern**: Async job processing for LLM operations
- **Event-Driven**: Jobs triggered by events
- **Configuration**: Environment-based setup

## Dependencies

| Dependency | Purpose |
|------------|---------|
| inngest | Queue and background job management |

## Interactions

### Inbound (Who uses this subsystem)
- **QueuedLLMRepository** → Uses Inngest for async operations
- **API routes** → May trigger background jobs

### Outbound (What this subsystem uses)
- **Inngest Cloud** ← For job orchestration
- **Environment variables** ← For configuration

## TO BE IMPROVED
- Add job monitoring and alerting
- Implement dead letter queues
- Add job prioritization
- Implement rate limiting per user/organization