# Agentic Repositories

## Why This Exists
This subsystem provides concrete implementations of LLM repository interfaces, handling communication with AI providers like OpenRouter and managing queued LLM operations for scalability.

## Mental Model
Adapters that translate between the agentic domain's needs and various LLM providers' APIs.

## Core Responsibility
This subsystem owns:
- LLM provider integrations (OpenRouter, future providers)
- Request/response translation for AI models
- Streaming and non-streaming generation
- Queue management for LLM operations
- Rate limiting and error handling

This subsystem does NOT own:
- Context building logic (delegated to services)
- Business logic (delegated to services)
- Repository interfaces (defined in llm.repository.interface.ts)

## Public API
See `interface.ts` for the public API. Main capabilities:
- `OpenRouterRepository` - OpenRouter LLM provider implementation
- `QueuedLLMRepository` - Queued wrapper for any LLM repository
- `ILLMRepository` - Interface for LLM operations

## Dependencies
See `dependencies.json` for allowed imports.

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for structure details.