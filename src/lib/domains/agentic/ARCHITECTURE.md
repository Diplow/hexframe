# Architecture: Agentic Domain

## Overview
See [README.md](./README.md) for why this domain exists.

## Internal Structure

```
agentic/
├── interface.ts              # Public API
├── dependencies.json         # Allowed imports
├── README.md                # Domain purpose
├── ARCHITECTURE.md          # This file
├── _objects/                # Domain entities (internal)
├── _actions/                # Domain actions (internal)
├── _repositories/           # Repository interfaces (internal)
│   └── llm.repository.ts   # LLM repository interface
├── _security/               # Security layer (internal)
├── infrastructure/          # External system adapters
│   └── inngest/            # Queue infrastructure
├── repositories/            # Repository implementations
│   ├── openrouter.repository.ts    # OpenRouter LLM provider
│   ├── queued-llm.repository.ts    # Async queue wrapper
│   └── llm.repository.interface.ts # Repository interface
├── services/                # Domain services
│   ├── agentic.service.ts          # Main orchestrator
│   ├── agentic.factory.ts          # Service factory
│   ├── canvas-context-builder.service.ts  # Canvas context building
│   ├── chat-context-builder.service.ts    # Chat context building
│   ├── context-composition.service.ts     # Context composition
│   ├── context-serializer.service.ts      # Context serialization
│   ├── tokenizer.service.ts               # Token counting
│   ├── canvas-strategies/   # Canvas context strategies
│   ├── chat-strategies/     # Chat context strategies
│   └── serializers/         # Serialization formats
└── types/                   # Domain types
    ├── context.types.ts     # Context-related types
    ├── contracts.ts         # API contracts
    ├── errors.ts            # Domain errors
    ├── job.types.ts         # Queue job types
    └── llm.types.ts         # LLM-related types
```

## Key Patterns
- **Strategy Pattern**: Different context building strategies for various use cases
- **Repository Pattern**: Abstract LLM provider access
- **Factory Pattern**: Service instantiation based on configuration
- **Composition Pattern**: Build complex contexts from simple components
- **Security Layers**: Multiple defense layers against prompt injection

## Dependencies

| Dependency | Purpose |
|------------|---------|
| ~/lib/domains/mapping | Access to map data for context |
| ~/lib/debug/debug-logger | Debugging and logging |
| inngest | Queue management for async operations |
| tiktoken | Token counting for context optimization |

## Interactions

### Inbound (Who uses this domain)
- **App Layer (Chat component)** → Uses AgenticService for AI interactions
- **tRPC API** → Exposes agentic operations
- **EventBus** → Receives requests for AI processing

### Outbound (What this domain uses)
- **repositories subsystem** ← For LLM provider access
- **infrastructure subsystem** ← For queue operations
- **Mapping domain** ← For map context data
- **OpenRouter API** ← Via repository for AI models

## TO BE IMPROVED
- Add more LLM providers (direct Anthropic, OpenAI)
- Implement response caching for identical contexts
- Add cost tracking and budgeting per user
- Implement fine-tuning support for domain-specific models
- Add multi-modal support (images, documents)