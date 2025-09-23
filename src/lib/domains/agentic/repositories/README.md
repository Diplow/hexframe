# Agentic Repositories

## Mental Model
Like a switchboard operator connecting the agentic domain to various AI providers, translating requests and managing the complexity of different LLM APIs.

## Responsibilities
- Implement concrete LLM repository interfaces for different AI providers (OpenRouter, future providers)
- Translate between domain LLM types and provider-specific API formats
- Handle both streaming and non-streaming LLM generation requests
- Manage async queue processing for slow LLM models to prevent request timeouts
- Provide consistent error handling and logging across all LLM providers

## Non-Responsibilities
- Context building logic → See `~/lib/domains/agentic/services/README.md`
- Business logic and agentic workflows → See `~/lib/domains/agentic/services/README.md`
- LLM type definitions → See `~/lib/domains/agentic/types/README.md`
- Queue infrastructure → See `~/lib/domains/agentic/infrastructure/inngest/README.md`

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.