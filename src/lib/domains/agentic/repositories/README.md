# Agentic Repositories

## Mental Model
Like a switchboard operator connecting the agentic domain to various AI providers, translating requests and managing the complexity of different LLM APIs. Each repository acts as an adapter translating the universal ILLMRepository interface to a specific provider's API.

## Responsibilities
- Implement concrete LLM repository interfaces for different AI providers (Claude Agent SDK, OpenRouter, future providers)
- Translate between domain LLM types and provider-specific API formats
- Handle both streaming and non-streaming LLM generation requests via async generators
- Manage async queue processing for slow LLM models to prevent request timeouts
- Provide consistent error handling and logging across all LLM providers
- Support tools/MCP server integration for agentic capabilities

## Non-Responsibilities
- Context building logic → See `~/lib/domains/agentic/services/README.md`
- Business logic and agentic workflows → See `~/lib/domains/agentic/services/README.md`
- LLM type definitions → See `~/lib/domains/agentic/types/README.md`
- Queue infrastructure → See `~/lib/domains/agentic/infrastructure/inngest/README.md`
- Helper utilities for SDK operations → See `./_helpers/` (internal utilities, not exported)

## Interface
**Exports**: See `index.ts` for the complete public API. Key exports:
- `ILLMRepository`: Repository interface defining the contract
- `ClaudeAgentSDKRepository`: Implementation using Claude Agent SDK with async generator streaming
- `OpenRouterRepository`: Implementation using OpenRouter API
- `QueuedLLMRepository`: Wrapper for async queue processing

**Dependencies**: See `dependencies.json` for allowed imports.

**Boundary Enforcement**: Child subsystems (like `_helpers/`) can access internals. Sibling and parent subsystems must use `index.ts` exports only. The `pnpm check:architecture` CI tool enforces this.