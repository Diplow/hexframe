# Architecture: Inngest API Route

## Overview
See [README.md](./README.md) for why this subsystem exists.

## Internal Structure

```
inngest/
├── README.md          # Subsystem purpose
├── ARCHITECTURE.md    # This file
├── dependencies.json  # Allowed imports
└── route.ts          # Route handler for Inngest webhook
```

## Key Patterns
- **Webhook Handler**: Receives events from Inngest cloud
- **Function Registration**: Registers background functions
- **HTTP Method Routing**: Handles GET, POST, PUT for different operations

## Dependencies

| Dependency | Purpose |
|------------|---------|
| inngest/next | Inngest Next.js adapter |
| ~/lib/domains/agentic/interface | Inngest client and functions |

## Interactions

### Inbound (Who uses this subsystem)
- **Inngest Cloud** → Sends events and function triggers
- **Health Checks** → GET requests for status

### Outbound (What this subsystem uses)
- **Agentic Domain** ← For Inngest client and functions
- **Background Functions** ← Executes registered functions

## TO BE IMPROVED
- Add webhook signature validation
- Implement request logging
- Add monitoring for function execution