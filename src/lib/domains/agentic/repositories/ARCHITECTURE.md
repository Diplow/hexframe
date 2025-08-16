# Architecture: Agentic Repositories

## Overview
See [README.md](./README.md) for why this subsystem exists.

## Internal Structure

```
repositories/
├── interface.ts                    # Public API exports
├── dependencies.json              # Allowed imports
├── README.md                      # Subsystem purpose
├── ARCHITECTURE.md                # This file
├── llm.repository.interface.ts   # Core LLM repository interface
├── openrouter.repository.ts      # OpenRouter API implementation
├── queued-llm.repository.ts      # Queue wrapper for async processing
├── index.ts                       # Main exports
└── __tests__/                     # Unit tests
    └── openrouter.repository.test.ts
```

## Key Patterns
- **Repository Pattern**: Implements ILLMRepository interface for different providers
- **Decorator Pattern**: QueuedLLMRepository wraps any ILLMRepository for async processing
- **Adapter Pattern**: Translates between domain models and provider-specific APIs
- **Error Handling**: Consistent error transformation across providers

## Dependencies

| Dependency | Purpose |
|------------|---------|
| ~/lib/debug/debug-logger | Debugging and logging |
| ../types/llm.types | LLM-related type definitions |
| ../infrastructure/inngest | Queue infrastructure for async processing |

## Interactions

### Inbound (Who uses this subsystem)
- **Agentic Services** → Uses repositories for LLM operations
- **Agentic Factory** → Instantiates repositories based on configuration

### Outbound (What this subsystem uses)
- **OpenRouter API** ← For AI model access
- **Inngest** ← For queued job processing
- **Debug Logger** ← For operation logging

## TO BE IMPROVED
- Add more LLM provider implementations (Anthropic direct, OpenAI, etc.)
- Implement retry logic with exponential backoff
- Add response caching for identical requests
- Implement cost tracking and budgeting
- Add request/response validation